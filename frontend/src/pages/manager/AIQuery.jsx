import { useState } from "react";
import { Send, Bot, Loader2, AlertCircle } from "lucide-react";

function AIQuery() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setAnswer(null);

    try {
      const response = await fetch(
        "http://localhost:8000/api/ai/query",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: question,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to get AI response."
        );
      }

      setAnswer(data);
    } catch (error) {
      console.error("AI query error:", error);

      setError(
        error.message ||
          "Something went wrong while contacting the AI assistant."
      );
    } finally {
      setLoading(false);
    }
  }

  function useExampleQuestion(example) {
    setQuestion(example);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <Bot className="text-blue-600" size={32} />
          AI Operations Assistant
        </h1>

        <p className="mt-2 text-gray-600">
          Ask questions about service operations and technician
          performance.
        </p>
      </div>

      {/* Query Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit}>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Ask an operational question
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              placeholder="Example: How many jobs were completed today?"
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Thinking...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Ask AI
                </>
              )}
            </button>
          </div>
        </form>

        {/* Example Questions */}
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-gray-700">
            Try asking:
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              "How many jobs were completed today?",
              "Which technician completed the most jobs this week?",
              "What jobs did Ali complete last week?",
              "How is the team's workload distributed this week?",
            ].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() =>
                  useExampleQuestion(example)
                }
                disabled={loading}
                className="rounded-full border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          <AlertCircle
            size={22}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              Unable to process question
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* AI Response */}
      {answer && (
        <div className="rounded-xl border border-blue-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 p-5">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <Bot size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                AI Response
              </h2>

              <p className="text-sm text-gray-500">
                Based on retrieved operational data
              </p>
            </div>
          </div>

          <div className="p-6">
            <p className="whitespace-pre-wrap text-gray-700">
              {answer.answer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIQuery;