import abc
import numpy as np

class BaseModel(abc.ABC):
    """
    Abstract Base class for all AI models in RoadLab.
    All future PyTorch, ONNX, and TensorRT models must inherit from this.
    """

    def __init__(self):
        self.model_path = None
        self.loaded = False

    @abc.abstractmethod
    def load(self, model_path: str) -> bool:
        """
        Loads the model weights from path.
        """
        pass

    @abc.abstractmethod
    def predict(self, frame: np.ndarray, **kwargs) -> dict:
        """
        Runs model inference on a single OpenCV frame (numpy array).
        Returns a dict of metadata outputs.
        """
        pass

class CustomModel(BaseModel):
    """
    Generic model interface for user-defined custom tensor structures.
    """
    def load(self, model_path: str) -> bool:
        self.model_path = model_path
        self.loaded = True
        return True

    def predict(self, frame: np.ndarray, **kwargs) -> dict:
        return {}
