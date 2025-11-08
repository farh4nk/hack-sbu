export const analyzeImage = async (base64Image, mode) => {
  try {
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: base64Image,
        mode: mode, // "live" or "explain"
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error calling backend:", error);
    return { summary: "Error connecting to backend" };
  }
};
