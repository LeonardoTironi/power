"""Ajusta hiperparâmetros por acurácia com validação cruzada aninhada."""

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.model_selection import GridSearchCV, StratifiedKFold

from compare_models import DATA_DIR, FOLDS, SEED, build_classifiers, evaluate, report_metadata
from train_model import FEATURES, TARGET, build_pipeline


INNER_FOLDS = 3
PARAMETER_GRIDS = {
    'knn': {
        'classifier__n_neighbors': [3, 5, 7, 9, 13, 17, 23],
        'classifier__weights': ['distance', 'uniform'],
        'classifier__p': [1, 2],
        'preprocessor__transformer_weights': [None, {'num': 1.5, 'cat': 1.0}, {'num': 2.0, 'cat': 1.0}],
    },
    'random_forest': {
        'classifier__n_estimators': [100, 200],
        'classifier__max_depth': [None, 6, 10],
        'classifier__min_samples_leaf': [1, 2, 4],
        'classifier__max_features': ['sqrt', 1.0],
    },
    'xgboost': {
        'classifier__estimator__n_estimators': [75, 150, 225],
        'classifier__estimator__max_depth': [2, 3, 5],
        'classifier__estimator__learning_rate': [0.03, 0.05, 0.1],
        'classifier__estimator__min_child_weight': [1, 3],
    },
}


def tune_models(dataset_path, output_dir, jobs):
    dataset = pd.read_csv(dataset_path, sep=';', usecols=[*FEATURES, TARGET]).dropna()
    X, y = dataset[FEATURES], dataset[TARGET]
    counts = y.value_counts().sort_index()
    if len(counts) < 2 or counts.min() < FOLDS:
        raise ValueError(f'A busca exige pelo menos duas classes com {FOLDS} registros cada.')

    labels = counts.index.tolist()
    outer_cv = StratifiedKFold(FOLDS, shuffle=True, random_state=SEED)
    inner_cv = StratifiedKFold(INNER_FOLDS, shuffle=True, random_state=SEED)
    splits = list(outer_cv.split(X, y))
    smallest_inner_training = min(
        len(inner_train)
        for train, _ in splits
        for inner_train, _ in inner_cv.split(X.iloc[train], y.iloc[train])
    )

    report = report_metadata(dataset_path, dataset, counts)
    report.update(inner_folds=INNER_FOLDS, selection_metric='accuracy')
    output_dir.mkdir(parents=True, exist_ok=True)

    for name, classifier in build_classifiers().items():
        pipeline = build_pipeline(classifier)
        param_grid = PARAMETER_GRIDS[name].copy()
        if name == 'knn':
            param_grid['classifier__n_neighbors'] = [
                k for k in param_grid['classifier__n_neighbors'] if k <= smallest_inner_training
            ]
        search = GridSearchCV(
            pipeline, param_grid, scoring='accuracy', cv=inner_cv, n_jobs=jobs, error_score='raise',
        )
        baseline = evaluate(pipeline, X, y, splits, labels)
        with joblib.parallel_config(backend='threading'):
            tuned = evaluate(search, X, y, splits, labels)
            search.fit(X, y)

        artifact = output_dir / f'{name}_tuned_model.joblib'
        joblib.dump(search.best_estimator_, artifact, compress=3)
        report['models'][name] = {
            'baseline': baseline,
            'tuned': tuned,
            'accuracy_delta': tuned['accuracy_mean'] - baseline['accuracy_mean'],
            'parameter_grid': param_grid,
            'candidate_count': len(search.cv_results_['params']),
            'exported_params': search.best_params_,
            'artifact': artifact.name,
        }
        print(f"{name}: acurácia {baseline['accuracy_mean']:.2%} → {tuned['accuracy_mean']:.2%}", flush=True)

    report_path = output_dir / 'model_tuning.json'
    report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Relatório: {report_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, default=DATA_DIR / 'dataset.csv')
    parser.add_argument('--output-dir', type=Path, default=DATA_DIR)
    parser.add_argument('--jobs', type=int, default=4)
    args = parser.parse_args()
    tune_models(args.dataset, args.output_dir, args.jobs)
