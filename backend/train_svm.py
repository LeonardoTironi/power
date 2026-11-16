"""Reproduz o modelo SVM selecionado na busca de hiperparâmetros."""

from sklearn.svm import SVC

from train_model import build_pipeline, load_training_data, save_pipeline, training_parser


if __name__ == '__main__':
    args = training_parser(__doc__, 'svm_tuned_model.joblib').parse_args()
    X, y = load_training_data(args.dataset)
    pipeline = build_pipeline(SVC(kernel='poly', degree=3, C=100, gamma=0.1, coef0=1.0))
    save_pipeline(pipeline.fit(X, y), args.output)
