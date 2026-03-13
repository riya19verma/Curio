import NewsAPI from "newsapi";
import pool from "../db/db.js";
import axios from "axios";
import fs from "fs";
import path from "path";

const newsapi = new NewsAPI(process.env.NEWS_API_KEY);

async function getNewsEmbedding(news) {

  await axios.post("http://localhost:8000/calculate_embeddings/news", {
        title: news.title,
        description: news.description
    });
  return response.data.embedding;

}

async function fetchNews() {

  try {

    const sources = await newsapi.v2.sources({
        language: 'en'
    });
    const response = await newsapi.v2.everything({
        language: "en",
        sortBy: "publishedAt",
        pageSize: 100,
        sources: sources.sources.map(source => source.id).join(",")
    });

    const articles = response.articles;

    console.log("Fetched:", articles[0].title);

    for (const article of articles) {

        //save article in .csv file
        const csvFilePath = path.resolve("news_articles.csv");      
        const csvHeaders = "title,description\n";

        // Write headers if file does not exist
        if (!fs.existsSync(csvFilePath)) {
            fs.writeFileSync(csvFilePath, csvHeaders);
        }

        // Escape double quotes and commas in CSV fields
        function escapeCsvField(field) {
            if (!field) return "";
            return `"${String(field).replace(/"/g, '""')}"`;
        }

        const csvLine = `${escapeCsvField(article.title)},${escapeCsvField(article.description)}\n`;
        fs.appendFileSync(csvFilePath, csvLine);

        const news = {
            title: article.title,
            description: article.description || ""
        }  
        const embedding = await getNewsEmbedding(news);
    }

  } catch (err) {

    console.error("News ingestion error:", err);

  }

}

export default fetchNews;