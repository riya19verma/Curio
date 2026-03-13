# Run this on a separate server
# uvicorn main:app --port 8000

from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI()

model = SentenceTransformer("all-MiniLM-L6-v2")

class NewsRequest(BaseModel):
    title: str
    description: str

@app.post("/calculate_embeddings/news")
async def news_embeddings_calculator(news: NewsRequest):

    title_embed = model.encode(news.title)
    desc_embed = model.encode(news.description)

    news_embedding = 0.7 * title_embed + 0.3 * desc_embed

    return {
        "embedding": news_embedding.tolist()
    }

class UserRequest(BaseModel):
    clicked_news: list
    user_embed: list

@app.post("/calculate_embeddings/user")
async def user_embeddings_calculator(user: UserRequest):
    return {
        "embedding": [clicked_news * 0.1 + user_embed * 0.2 for clicked_news, user_embed in zip(user.clicked_news, user.user_embed)]
    }