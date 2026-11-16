"""Reproduz o modelo de regressão logística selecionado na busca de hiperparâmetros."""

from sklearn.linear_model import LogisticRegression

from train_model import build_pipeline, load_training_data, save_pipeline, training_parser


if __name__ == '__main__':
    args = training_parser(__doc__, 'logistic_regression_tuned_model.joblib').parse_args()
    X, y = load_training_data(args.dataset)
    pipeline = build_pipeline(
        LogisticRegression(C=30, class_weight='balanced', solver='lbfgs', max_iter=2000)
    )
    save_pipeline(pipeline.fit(X, y), args.output)
