from sklearn.base import BaseEstimator, ClassifierMixin, clone
from sklearn.preprocessing import LabelEncoder
from sklearn.utils.validation import check_is_fitted


class EncodedLabelClassifier(ClassifierMixin, BaseEstimator):
    """Adapta um classificador de rótulos inteiros para retornar níveis de força."""

    def __init__(self, estimator):
        self.estimator = estimator

    def fit(self, X, y):
        self.label_encoder_ = LabelEncoder()
        encoded_labels = self.label_encoder_.fit_transform(y)
        self.estimator_ = clone(self.estimator).fit(X, encoded_labels)
        self.classes_ = self.label_encoder_.classes_
        return self

    def predict(self, X):
        check_is_fitted(self, 'estimator_')
        return self.label_encoder_.inverse_transform(self.estimator_.predict(X))
