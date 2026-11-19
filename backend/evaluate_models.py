"""Avalia os três modelos em um conjunto de teste separado (RNF03).

Usa a mesma divisão do KNN (20% para teste, semente 42). O KNN versionado já foi
treinado só com os 80% restantes. A regressão logística e o SVM são treinados de
novo nesses 80%, com os hiperparâmetros escolhidos, porque os arquivos
versionados usam o CSV inteiro e já viram os registros de teste.
"""

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import sklearn
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC

from train_model import DATA_DIR, build_pipeline, load_training_data

META = 0.80
CLASSES = ['iniciante', 'intermediario', 'avancado']
METRICAS = ('precision', 'recall', 'f1-score', 'support')


def avaliar(nome, pipeline, X_test, y_test):
    previsto = pipeline.predict(X_test)
    relatorio = classification_report(
        y_test, previsto, labels=CLASSES, output_dict=True, zero_division=0
    )
    resultado = {
        'accuracy': accuracy_score(y_test, previsto),
        'f1_macro': f1_score(y_test, previsto, labels=CLASSES, average='macro'),
        'per_class': {c: {k: relatorio[c][k] for k in METRICAS} for c in CLASSES},
        'confusion_matrix': {
            'labels': CLASSES,
            'matrix': confusion_matrix(y_test, previsto, labels=CLASSES).tolist(),
        },
    }
    resultado['meets_rnf03'] = resultado['accuracy'] >= META and resultado['f1_macro'] >= META
    situacao = 'atingida' if resultado['meets_rnf03'] else 'não atingida'
    print(f"{nome}: acurácia {resultado['accuracy']:.2%}, "
          f"F1 macro {resultado['f1_macro']:.2%}, meta {situacao}")
    for c in CLASSES:
        print(f"  {c:<14} F1 {resultado['per_class'][c]['f1-score']:.2%}")
    return resultado


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, default=DATA_DIR / 'dataset.csv')
    parser.add_argument('--knn', type=Path, default=DATA_DIR / 'knn_model.joblib')
    parser.add_argument('--output', type=Path, default=DATA_DIR / 'test_evaluation.json')
    args = parser.parse_args()

    X, y = load_training_data(args.dataset)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    knn = joblib.load(args.knn)
    knn_refeito = clone(knn).fit(X_train, y_train)
    if not np.array_equal(knn.predict(X), knn_refeito.predict(X)):
        raise SystemExit('O KNN versionado não foi treinado com a divisão de treino; '
                         'a avaliação não seria separada.')

    regressao = LogisticRegression(
        C=30, class_weight='balanced', solver='lbfgs', max_iter=2000
    )
    svm = SVC(kernel='poly', degree=3, C=100, gamma=0.1, coef0=1.0)
    modelos = {
        'logistic_regression': build_pipeline(regressao).fit(X_train, y_train),
        'svm': build_pipeline(svm).fit(X_train, y_train),
        'knn': knn,
    }

    resultado = {
        'dataset': args.dataset.name,
        'rows': len(X),
        'split': {
            'test_size': 0.2,
            'random_state': 42,
            'train_rows': len(X_train),
            'test_rows': len(X_test),
            'test_class_counts': y_test.value_counts().reindex(CLASSES).astype(int).to_dict(),
        },
        'target': {'accuracy': META, 'f1_macro': META},
        'versions': {'scikit-learn': sklearn.__version__},
        'models': {nome: avaliar(nome, m, X_test, y_test) for nome, m in modelos.items()},
    }
    texto = json.dumps(resultado, indent=2, ensure_ascii=False) + '\n'
    args.output.write_text(texto, encoding='utf-8')
    print(f'Relatório salvo em {args.output.resolve()}')


if __name__ == '__main__':
    main()
