(() => {
    const summarizeBtn = document.getElementById("summerize");
    const copyBtn = document.getElementById("copy-btn");
    const resultBox = document.getElementById("result");
    const settingsBtn = document.getElementById("settings-btn");
  
    const renderLoading = () => {
      resultBox.innerHTML = `<div class="loading"><div class="loader"></div></div>`;
    };
  
    const renderError = (message) => {
      resultBox.innerHTML = `<span style="color: red;">❌ ${message}</span>`;
    };
  
    const renderSummary = (summary, type) => {
      // Format bullet points into list
      if (type === "bullets") {
        const bullets = summary
          .split("\n")
          .filter(line => line.trim().startsWith("- "))
          .map(item => `<li>${item.replace(/^[-•]\s*/, "")}</li>`)
          .join("");
        resultBox.innerHTML = `<ul>${bullets}</ul>`;
      } else {
        resultBox.textContent = summary;
      }
    };
  
    const getGeminiSummary = async (rawText, type, apiKey) => {
      const max = 20000;
      const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;
  
      const promptMap = {
        brief: `Summarize in 2-3 sentences:\n\n${text}`,
        detailed: `Give a detailed summary:\n\n${text}`,
        bullets: `Summarize in 5-10 bullet points (start each line with "- "):\n\n${text}`,
      };
      const prompt = promptMap[type] || promptMap.brief;
  
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
      const payload = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 1,
            topP: 1,
            maxOutputTokens: 1024,
          },
        }),
      };
  
      const res = await fetch(geminiUrl, payload);
      const data = await res.json();
  
      if (!res.ok) {
        const err = data?.error?.message || "Request failed";
        throw new Error(err);
      }
  
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error("No summary returned.");
      return content.trim();
    };

    settingsBtn.addEventListener("click",()=>{
      chrome.tabs.create({url: "options.html"});
      return;
    })
  
    summarizeBtn.addEventListener("click", () => {
      const type = document.getElementById("summery-type").value;
      renderLoading();
  
      chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
        if (!geminiApiKey) {
          renderError("Missing API Key. Please set it in extension settings.");
          chrome.tabs.create({url: 'options.html'})
          return;
        }
  
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          chrome.tabs.sendMessage(tab.id, { type: "GET_ARTICLE_TEXT" }, async (res) => {
            const text = res?.text;
            if (!text) {
              renderError("Couldn't extract readable content from this page. Refresh the page or try another News Page.");
              return;
            }
  
            try {
              const summary = await getGeminiSummary(text, type, geminiApiKey);
              renderSummary(summary, type);
            } catch (err) {
              renderError("Gemini error: " + err.message);
            }
          });
        });
      });
    });
  
    copyBtn.addEventListener("click", () => {
      const totalText = resultBox.innerText;
      if (!totalText) return;
  
      navigator.clipboard.writeText(totalText).then(() => {
        const oldText = copyBtn.textContent;
        copyBtn.textContent = "✅ Copied!";
        copyBtn.disabled = true;
        setTimeout(() => {
          copyBtn.textContent = oldText;
          copyBtn.disabled = false;
        }, 1500);
      });
    });
  })();
  