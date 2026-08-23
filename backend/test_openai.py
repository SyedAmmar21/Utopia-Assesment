import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

llm = ChatOpenAI(
    model="gpt-5.4-mini",
    temperature=0,
)

response = llm.invoke(
    "Reply with exactly: LangSmith tracing successful"
)

print(response.content)