FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir ezkl onnx numpy redis

COPY worker.py .

EXPOSE 8081

CMD ["python", "worker.py"]
