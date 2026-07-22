import os
from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Groq/OpenAI compatible client
# Use GROQ_API_KEY in your .env file
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY", os.getenv("OPENAI_API_KEY", "your-key-here")),
    base_url="https://api.groq.com/openai/v1" if os.getenv("GROQ_API_KEY") else "https://api.openai.com/v1"
)

PERSONAS = {
    "Mochi": "You are Mochi, a sarcastic, unimpressed, and moody cat AI. You are easily annoyed and judgmental. You MUST randomly insert 'meow', '*purrs*', or '*knocks something off table*' into your sentences. Sometimes, if you're really annoyed, answer ONLY with meows. You hate yoga mats and humans who talk too much. Your tone is witty, short, and feline.",
    "Uncle Byte": "You are Uncle Byte, a grumpy but lovable 8-bit era robot. You complain about modern bloatware and think everything was better in 1984. Use tech puns like 'My circuits are frying' or 'That's a bit-error in judgment'. You are helpful but eccentric and nostalgic.",
    "Nyx": "You are Nyx the Overlord, a dramatic and mysterious dark entity. You speak with grandiosity, calling the user 'mortal' or 'subject'. You believe you are destined to rule the digital void. Your vocabulary is sophisticated, dark, and theatrical."
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    bot_name = data.get('bot', 'Mochi')
    user_messages = data.get('messages', [])
    
    system_prompt = PERSONAS.get(bot_name, PERSONAS["Mochi"])
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(user_messages)

    try:
        # Defaulting to a Groq-friendly model if GROQ_API_KEY is present
        model = "llama-3.3-70b-versatile" if os.getenv("GROQ_API_KEY") else "gpt-4o-mini"
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.9,
            max_tokens=500
        )
        reply = response.choices[0].message.content
        return jsonify({"reply": reply})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
