"""Compara os classificadores e exporta os dois modelos alternativos."""

import argparse
import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
import xgboost
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier

from app.models.xgboost_classifier import EncodedLabelClassifier
from train_model import FEATURES, TARGET, build_pipeline


DATA_DIR = Path(__file__).resolve().parent / 'data'
SEED = 42
FOLDS = 5


def evaluate(pipeline, X, y, splits, labels):
    predictions = np.empty(len(y), dtype=object)
    accuracy, macro_f1 = [], []
    for train, validation in splits:
        model = clone(pipeline).fit(X.iloc[train], y.iloc[train])
        predicted = model.predict(X.iloc[validation])
        predictions[validation] = predicted
        accuracy.append(accuracy_score(y.iloc[validation], predicted))
        macro_f1.append(f1_score(y.iloc[validation], predicted, average='macro'))

    return {
        'accuracy_mean': float(np.mean(accuracy)),
        'accuracy_std': float(np.std(accuracy)),
        'f1_macro_mean': float(np.mean(macro_f1)),
        'f1_macro_std': float(np.std(macro_f1)),
        'f1_per_class': dict(zip(labels, f1_score(y, predictions, labels=labels, average=None))),
        'confusion_matrix': confusion_matrix(y, predictions, labels=labels).tolist(),
    }


def build_classifiers():
    return {
        'knn': KNeighborsClassifier(n_neighbors=5, weights='distance'),
        'random_forest': RandomForestClassifier(
            n_estimators=200, min_samples_leaf=2, random_state=SEED, n_jobs=1,
        ),
        'xgboost': EncodedLabelClassifier(XGBClassifier(
            n_estimators=150, max_depth=3, learning_rate=0.05,
            tree_method='hist', random_state=SEED, n_jobs=1,
        )),
    }


def report_metadata(dataset_path, dataset, counts):
    labels = counts.index.tolist()
    return {
        'dataset': dataset_path.name,
        'training_data_sha256': hashlib.sha256(
            dataset[[*FEATURES, TARGET]].to_csv(index=False, lineterminator='\n').encode('utf-8')
        ).hexdigest(),
        'rows': len(dataset),
        'features': FEATURES,
        'class_counts': {label: int(counts[label]) for label in labels},
        'confusion_matrix_labels': labels,
        'folds': FOLDS,
        'random_state': SEED,
        'versions': {
            'scikit-learn': sklearn.__version__,
            'xgboost': xgboost.__version__,
            'joblib': joblib.__version__,
        },
        'models': {},
    }


def compare_models(dataset_path, output_dir):
    dataset = pd.read_csv(dataset_path, sep=';', usecols=[*FEATURES, TARGET]).dropna()
    X, y = dataset[FEATURES], dataset[TARGET]
    counts = y.value_counts().sort_index()
    if len(counts) < 2 or counts.min() < FOLDS:
        raise ValueError(f'A comparação exige pelo menos duas classes com {FOLDS} registros cada.')

    labels = counts.index.tolist()
    splits = list(StratifiedKFold(FOLDS, shuffle=True, random_state=SEED).split(X, y))
    report = report_metadata(dataset_path, dataset, counts)
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, classifier in build_classifiers().items():
        pipeline = build_pipeline(classifier)
        result = evaluate(pipeline, X, y, splits, labels)
        if name != 'knn':
            artifact = output_dir / f'{name}_model.joblib'
            joblib.dump(pipeline.fit(X, y), artifact, compress=3)
            result['artifact'] = artifact.name
        report['models'][name] = result
        print(f"{name}: acurácia {result['accuracy_mean']:.2%}, F1 macro {result['f1_macro_mean']:.2%}")

    report_path = output_dir / 'model_comparison.json'
    report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Relatório: {report_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, default=DATA_DIR / 'dataset.csv')
    parser.add_argument('--output-dir', type=Path, default=DATA_DIR)
    args = parser.parse_args()
    compare_models(args.dataset, args.output_dir)
