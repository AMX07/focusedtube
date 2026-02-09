import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from youtube_transcript_api import YouTubeTranscriptApi
import anthropic

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

SUMMARY_PROMPT = """You are given the full transcript of a YouTube video.
Produce a structured summary with the following sections:

1. **Overview** — A 2-3 sentence high-level summary of what the video covers.
2. **Key Takeaways** — A bulleted list of the most important points, concepts, or lessons from the video (aim for 5-10 items).
3. **Detailed Notes** — A concise but thorough breakdown of the content organized by topic or chronological section. Use sub-bullets where helpful.

Keep the language clear and concise. Focus on substance over filler.

Here is the transcript:

{transcript}"""


@app.get("/api/summary/{video_id}")
async def get_summary(video_id: str):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY environment variable is not set.",
        )

    # Fetch transcript
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id)
        full_text = " ".join(snippet.text for snippet in transcript.snippets)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not fetch transcript for video {video_id}: {str(e)}",
        )

    if not full_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript is empty for this video.",
        )

    # Summarize with Claude
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": SUMMARY_PROMPT.format(transcript=full_text),
                }
            ],
        )
        summary = message.content[0].text
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM summarization failed: {str(e)}",
        )

    return {"video_id": video_id, "summary": summary}
