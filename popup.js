
document.getElementById('summerize').addEventListener('click',()=>{
    const result = document.getElementById('result')
    result.innerHTML = '<div class="loader"></div>';
    const summeryType = document.getElementById("summery-type").value;

    async function getGeminiSummary(rawText, type, apikey) {
        const max = 20000;
        const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;
    
        const promptMap = {
            brief: `Summarize in 2-3 sentences:\n\n${text}`,
            detailed: `Give a detailed summary:\n\n${text}`,
            bullets: `Summarize in 5-10 bullet points (start each line with "- "):\n\n${text}`
        };
        const prompt = promptMap[type] || promptMap.brief;
    
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apikey}`;
    
        const payload = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 1024
                }
            })
        };
    
        const res = await fetch(geminiUrl, payload);
    
        if (!res.ok) {
            const { error } = await res.json();
            throw new Error(error?.message || "Gemini request failed");
        }
    
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No Summary.";
    }

    chrome.storage.sync.get(["geminiApiKey"],({geminiApiKey})=>{
        if (!geminiApiKey) {
            result.textContent = "No API key set."
            return;
        }

        chrome.tabs.query({active:true,currentWindow:true},([tab])=>{
            chrome.tabs.sendMessage(tab.id,{type:"GET_ARTICLE_TEXT"},async ({text})=>{
                if(!text){
                    result.textContent = "Couldn't extract text from this page.";
                    return;
                }
                
                try {
                    const summery = await getGeminiSummary(text,summeryType,geminiApiKey)
                    result.textContent = summery;
                } catch (error) {
                    result.textContent = "Gemini error: " + error.message;
                }
            })
        })
    })
})

document.getElementById("copy-btn").addEventListener('click',()=>{
    const totalText = document.getElementById("result").innerText;
    if(!totalText) return;

    navigator.clipboard.writeText(totalText).then(()=>{
        const btn = document.getElementById("copy-btn");
        const old = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(()=> (btn.textContent = old), 2000)
    })
})

