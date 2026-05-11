FROM python:3.11-slim
WORKDIR /app
COPY server.py keys.json ./
EXPOSE 10000
CMD ["python", "server.py"]
