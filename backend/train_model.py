"""Treina o KNN usado pela API e exporta o pipeline em Joblib."""

import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


DATA_DIR = Path(__file__).resolve().parent / 'data'
NUMERIC_FEATURES = ['idade', 'peso', 'carga']
CATEGORICAL_FEATURES = ['levantamento', 'genero']
FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
TARGET = 'nivel'


def build_pipeline(classifier, *, sparse_categories=False):
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), NUMERIC_FEATURES),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=sparse_categories), CATEGORICAL_FEATURES),
        ]
    )
    return Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', classifier),
    ])


def training_parser(description, model_filename):
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument('--dataset', type=Path, default=DATA_DIR / 'dataset.csv',
                        help='CSV de treinamento (padrão: data/dataset.csv)')
    parser.add_argument('--output', type=Path, default=DATA_DIR / model_filename,
                        help=f'Arquivo Joblib de saída (padrão: data/{model_filename})')
    return parser


def load_training_data(dataset_path):
    dataset = pd.read_csv(dataset_path, sep=';', usecols=[*FEATURES, TARGET]).dropna()
    return dataset[FEATURES], dataset[TARGET]


def save_pipeline(pipeline, output_path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, output_path, compress=3)
    print(f'Modelo salvo em {output_path.resolve()}')


def train_and_export_model(neighbors: int, dataset_path=DATA_DIR / 'dataset.csv',
                           output_path=DATA_DIR / 'knn_model.joblib'):
    X, y = load_training_data(dataset_path)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    pipeline = build_pipeline(
        KNeighborsClassifier(n_neighbors=neighbors, weights='distance', p=2),
        sparse_categories=True,
    )
    pipeline.fit(X_train, y_train)
    print(f'Acurácia na divisão de teste: {pipeline.score(X_test, y_test):.2%}')
    save_pipeline(pipeline, output_path)


if __name__ == "__main__":
    parser = training_parser(__doc__, 'knn_model.joblib')
    parser.add_argument("--neighbors", type=int, default=5, help="Número de vizinhos para o KNN (padrão: 5)")
    args = parser.parse_args()
    train_and_export_model(args.neighbors, args.dataset, args.output)
