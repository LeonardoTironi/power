"""Compara buscas de hiperparâmetros de regressão logística e SVM em várias sementes."""

import argparse
import json
from pathlib import Path
from statistics import mean, stdev

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, ParameterGrid, StratifiedKFold
from sklearn.svm import SVC

from compare_models import DATA_DIR, FOLDS, SEED, evaluate, report_metadata
from train_model import FEATURES, TARGET, build_pipeline
from tune_models import INNER_FOLDS


SEEDS = (SEED, 7, 19, 31, 67, 101)
LOGISTIC_BASELINE = {'classifier__C': [0.1, 1, 10, 100]}
SVM_BASELINE = {
    'classifier__C': [0.5, 2, 8, 32, 128],
    'classifier__gamma': [0.01, 0.05, 0.15, 0.5, 'scale'],
}
MODELS = {
    'logistic_regression': (
        LogisticRegression(max_iter=2000),
        LOGISTIC_BASELINE,
        [{
            'classifier__C': [0.1, 1, 3, 10, 30, 100, 300, 1000],
            'classifier__class_weight': [None, 'balanced'],
            'preprocessor__transformer_weights': [
                None, {'num': 0.5, 'cat': 1.0}, {'num': 2.0, 'cat': 1.0},
            ],
        }],
    ),
    'svm': (
        SVC(),
        SVM_BASELINE,
        [
            {
                'classifier__kernel': ['rbf'],
                'classifier__C': [0.5, 2, 8, 32, 128, 512],
                'classifier__gamma': [0.005, 0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.5, 'scale'],
            },
            {
                'classifier__kernel': ['linear'],
                'classifier__C': [0.1, 1, 10, 100],
            },
            {
                'classifier__kernel': ['poly'],
                'classifier__C': [1, 10, 100],
                'classifier__degree': [2, 3],
                'classifier__coef0': [0.0, 1.0],
                'classifier__gamma': ['scale', 0.1],
            },
        ],
    ),
}


def make_search(estimator, grid, seed):
    return GridSearchCV(
        build_pipeline(estimator),
        grid,
        scoring='accuracy',
        cv=StratifiedKFold(INNER_FOLDS, shuffle=True, random_state=seed),
        error_score='raise',
    )


def summarize(runs):
    accuracy = [run['accuracy_mean'] for run in runs]
    return {
        'accuracy_mean': mean(accuracy),
        'accuracy_std_between_seeds': stdev(accuracy),
        'accuracy_min': min(accuracy),
        'accuracy_max': max(accuracy),
        'f1_macro_mean': mean(run['f1_macro_mean'] for run in runs),
        'f1_per_class_mean': {
            label: mean(run['f1_per_class'][label] for run in runs)
            for label in runs[0]['f1_per_class']
        },
    }


def run_experiment(dataset_path, output_dir):
    dataset = pd.read_csv(dataset_path, sep=';', usecols=[*FEATURES, TARGET]).dropna()
    X, y = dataset[FEATURES], dataset[TARGET]
    counts = y.value_counts().sort_index()
    if len(counts) < 2 or counts.min() < FOLDS:
        raise ValueError(f'A busca exige pelo menos duas classes com {FOLDS} registros cada.')

    labels = counts.index.tolist()
    splits_by_seed = {
        seed: list(StratifiedKFold(FOLDS, shuffle=True, random_state=seed).split(X, y))
        for seed in SEEDS
    }
    report = report_metadata(dataset_path, dataset, counts)
    report.update(outer_seeds=SEEDS, inner_folds=INNER_FOLDS, selection_metric='accuracy')
    output_dir.mkdir(parents=True, exist_ok=True)

    for name, (estimator, baseline_grid, expanded_grid) in MODELS.items():
        runs = []
        for seed, splits in splits_by_seed.items():
            baseline = evaluate(make_search(estimator, baseline_grid, seed), X, y, splits, labels)
            expanded = evaluate(make_search(estimator, expanded_grid, seed), X, y, splits, labels)
            runs.append({'seed': seed, 'baseline': baseline, 'expanded': expanded})
            print(
                f'{name}, semente {seed}: {baseline["accuracy_mean"]:.2%} → {expanded["accuracy_mean"]:.2%}',
                flush=True,
            )

        final_search = make_search(estimator, expanded_grid, SEED).fit(X, y)
        artifact = output_dir / f'{name}_tuned_model.joblib'
        joblib.dump(final_search.best_estimator_, artifact, compress=3)
        report['models'][name] = {
            'baseline_grid': baseline_grid,
            'expanded_grid': expanded_grid,
            'baseline_candidate_count': len(ParameterGrid(baseline_grid)),
            'expanded_candidate_count': len(ParameterGrid(expanded_grid)),
            'baseline': summarize([run['baseline'] for run in runs]),
            'expanded': summarize([run['expanded'] for run in runs]),
            'runs': runs,
            'exported_params': final_search.best_params_,
            'artifact': artifact.name,
        }

    report_path = output_dir / 'logistic_svm_tuning.json'
    report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Relatório: {report_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, default=DATA_DIR / 'dataset.csv')
    parser.add_argument('--output-dir', type=Path, default=DATA_DIR)
    args = parser.parse_args()
    run_experiment(args.dataset, args.output_dir)
