FROM python:3.12-slim
WORKDIR /app
COPY chat/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY chat/server.py ./server.py
COPY chat/inbox.py ./inbox.py
COPY chat/ptz.py ./ptz.py
COPY chat/ptz_routes.py ./ptz_routes.py
COPY chat/analytics.py ./analytics.py
COPY chat/hatch.py ./hatch.py
COPY chat/app_entry.py ./app_entry.py
COPY chat/patch_super.py ./patch_super.py
RUN python ./patch_super.py && rm ./patch_super.py
ENV PORT=8080
CMD ["sh","-c","uvicorn app_entry:app --host 0.0.0.0 --port ${PORT:-8080}"]
