/**
 * aiService.js
 * Interfaces with Google Gemini 1.5 Flash API via native fetch.
 * Implements full offline fallbacks if the API key is missing or calls fail.
 */
const config = require('../config/identityVerification'); // Using config pattern

// Native fetch helper to communicate with Gemini
async function callGemini(contents, systemInstruction = '', forceJson = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[aiService] WARNING: GEMINI_API_KEY not found in environment. Running in heuristic mock mode.');
    throw new Error('API_KEY_MISSING');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    }
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (forceJson) {
    body.generationConfig.responseMimeType = 'application/json';
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[aiService] Gemini API returned error status:', response.status, errorText);
      throw new Error(`API_ERROR_${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('API_RESPONSE_EMPTY');
    }
    return text;
  } catch (err) {
    console.error('[aiService] callGemini failed, cascading to fallback:', err.message);
    throw err; // Let caller catch and handle fallback
  }
}

// Heuristic fallback for Review Sentiment Analysis
function analyzeSentimentFallback(comment = '') {
  const text = comment.toLowerCase();
  const positiveWords = ['good', 'great', 'excellent', 'beautiful', 'love', 'spacious', 'nice', 'perfect', 'clean', 'comfortable', 'best', 'well', 'amazing', 'friendly'];
  const negativeWords = ['bad', 'poor', 'dirty', 'far', 'expensive', 'hate', 'worst', 'broken', 'weak', 'small', 'noisy', 'rude', 'uncomfortable', 'damage'];

  let posCount = 0;
  let negCount = 0;
  const insights = [];

  positiveWords.forEach(word => {
    if (text.includes(word)) {
      posCount++;
      if (insights.length < 3) insights.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
  });

  negativeWords.forEach(word => {
    if (text.includes(word)) {
      negCount++;
      if (insights.length < 3) insights.push(`Negative ${word}`);
    }
  });

  let sentiment = 'neutral';
  let score = 0.5;

  if (posCount > negCount) {
    sentiment = 'positive';
    score = Math.min(0.95, 0.5 + (posCount - negCount) * 0.15);
  } else if (negCount > posCount) {
    sentiment = 'negative';
    score = Math.max(0.05, 0.5 - (negCount - posCount) * 0.15);
  }

  if (insights.length === 0) {
    insights.push(sentiment === 'positive' ? 'Satisfied client' : sentiment === 'negative' ? 'Needs improvements' : 'Standard review');
  }

  return {
    sentiment,
    score,
    insights,
  };
}

async function analyzeSentiment(comment) {
  if (!comment || !comment.trim()) {
    return { sentiment: 'neutral', score: 0.5, insights: ['No comments'] };
  }

  try {
    const systemPrompt = `You are an NLP Sentiment Classifier. Analyze the user product/housing review and classify it as positive, negative, or neutral. Also provide a confidence score between 0.0 and 1.0, and extract up to 3 short comma-separated key aspects or insights (e.g. "Spacious room", "High price"). You MUST return a JSON object with keys: "sentiment" (either "positive", "negative", or "neutral"), "score" (number), and "insights" (array of strings).`;
    const contents = [{ role: 'user', parts: [{ text: `Analyze this review: "${comment}"` }] }];

    const jsonText = await callGemini(contents, systemPrompt, true);
    const result = JSON.parse(jsonText);
    return {
      sentiment: result.sentiment || 'neutral',
      score: Number(result.score) || 0.5,
      insights: Array.isArray(result.insights) ? result.insights : [],
    };
  } catch (_err) {
    return analyzeSentimentFallback(comment);
  }
}

// Heuristic fallback for Product Comparison
function compareProductsFallback(products) {
  if (!products || products.length === 0) return 'No products selected for comparison.';
  if (products.length === 1) return `Only one product: "${products[0].title}". Select another one to compare.`;

  const summaries = products.map((p, idx) => {
    const beds = p.attributes?.beds ? `${p.attributes.beds} bedrooms` : '';
    const cond = p.attributes?.condition ? `${p.attributes.condition} condition` : '';
    const desc = [beds, cond].filter(Boolean).join(', ');
    return `Product ${idx + 1} ("${p.title}") is priced at ৳${p.price.toLocaleString()} in ${p.location}${desc ? ` (${desc})` : ''}.`;
  });

  return `${summaries.join(' ')} Based on price and location metrics, ${products[0].title} offers a different option compared to ${products[1].title}. Compare their features above to make your decision.`;
}

async function generateComparisonSummary(products) {
  try {
    const systemPrompt = `You are a Smart Real Estate and Marketplace Consultant. Compare the provided products (which are flats for rent/sale, appliances, or furniture in Bangladesh) based on their attributes, prices, locations, and ratings. Write a brief, user-friendly summary (2-3 sentences) explaining the pros and cons of each, helping a buyer decide which matches their needs better. Keep your comparison direct and objective.`;
    const productsData = products.map(p => ({
      title: p.title,
      price: p.price,
      location: p.location,
      attributes: p.attributes,
      description: p.description,
    }));
    const contents = [{ role: 'user', parts: [{ text: `Compare these items: ${JSON.stringify(productsData)}` }] }];

    return await callGemini(contents, systemPrompt, false);
  } catch (_err) {
    return compareProductsFallback(products);
  }
}

// Heuristic fallback for Recommendations
function getRecommendationsFallback(userProfile, favourites, purchaseHistory, listings) {
  // Simple content-based filtering:
  // If the user has a favourite listing, try to recommend items in the same location or same category.
  const favLocations = new Set(favourites.map(f => f.location?.toLowerCase().split(',')[0].trim()).filter(Boolean));
  const favCategories = new Set(favourites.map(f => f.category).filter(Boolean));

  // If no favourites, try from purchaseHistory
  purchaseHistory.forEach(order => {
    if (order.category) favCategories.add(order.category);
    if (order.location) favLocations.add(order.location.toLowerCase().split(',')[0].trim());
  });

  // Score available listings
  const scored = listings.map(item => {
    let score = 0;
    const itemLoc = item.location?.toLowerCase().split(',')[0].trim();
    if (favLocations.has(itemLoc)) score += 50;
    if (favCategories.has(item.category)) score += 30;
    
    // Slight boost to verified sellers
    if (item.seller_verified) score += 10;

    return { item, score };
  });

  // Sort and pick top 6
  scored.sort((a, b) => b.score - a.score);
  
  const recommendedItems = scored.slice(0, 6).map(s => ({
    ...s.item,
    ai_reason: s.score > 0 
      ? `Recommended because you expressed interest in similar ${s.item.category.replaceAll('_', ' ')} listings in this area.`
      : `Popular active listing on Thikana matching community trends.`
  }));

  return {
    recommendations: recommendedItems,
    summary: `We found ${recommendedItems.length} listings that match your browsing history, location preferences, and marketplace interests.`
  };
}

async function generateRecommendations(userProfile, favourites, purchaseHistory, listings) {
  if (!listings || listings.length === 0) {
    return { recommendations: [], summary: 'No live listings available at this moment.' };
  }

  try {
    const systemPrompt = `You are the Thikana Recommendation Engine. You will receive a user profile, their saved favourites, purchase history, and a list of available listings. Recommend the top 5 most suitable listings. For each recommendation, provide an "ai_reason" explaining exactly why it is recommended based on their preferences. Respond with a JSON object containing a "summary" (string overview) and a "recommendations" array. Each item in the array must be an object with keys "id" (the listing id) and "ai_reason" (string).`;
    
    const inputContext = {
      profile: { address: userProfile?.address, role: userProfile?.role },
      favourites: favourites.map(f => ({ id: f.id, category: f.category, location: f.location, price: f.price })),
      purchaseHistory: purchaseHistory.map(o => ({ id: o.id, category: o.category, price: o.price })),
      availableListings: listings.map(l => ({ id: l.id, category: l.category, location: l.location, price: l.price, title: l.title }))
    };

    const contents = [{ role: 'user', parts: [{ text: `Analyze preferences and listings: ${JSON.stringify(inputContext)}` }] }];
    const jsonText = await callGemini(contents, systemPrompt, true);
    const result = JSON.parse(jsonText);

    // Map the recommendations back to the actual listings objects
    const recommendedListings = [];
    if (Array.isArray(result.recommendations)) {
      result.recommendations.forEach(rec => {
        const found = listings.find(l => String(l.id) === String(rec.id));
        if (found) {
          recommendedListings.push({
            ...found,
            ai_reason: rec.ai_reason || 'Matches your budget and location preferences.',
          });
        }
      });
    }

    // Fill up if model returned less than expected
    if (recommendedListings.length === 0) {
      return getRecommendationsFallback(userProfile, favourites, purchaseHistory, listings);
    }

    return {
      recommendations: recommendedListings,
      summary: result.summary || 'AI-curated recommendations based on your profile activity.',
    };
  } catch (err) {
    console.error('[aiService] generateRecommendations failed, using fallback:', err.message);
    return getRecommendationsFallback(userProfile, favourites, purchaseHistory, listings);
  }
}

// Heuristic chatbot fallback
function generateChatbotResponseFallback(message = '', listings = []) {
  const query = message.toLowerCase();
  
  // Find listings in query location or category
  const matching = listings.filter(l => {
    const loc = l.location?.toLowerCase() || '';
    const title = l.title?.toLowerCase() || '';
    const desc = l.description?.toLowerCase() || '';
    const cat = l.category?.toLowerCase() || '';
    return query.includes(loc) || query.includes(cat) || query.includes(title) || query.includes(desc);
  }).slice(0, 3);

  let response = '';

  if (query.includes('flat') || query.includes('house') || query.includes('rent') || query.includes('sell')) {
    response += `🏠 Looking for properties? I checked our catalog and found some options for you.\n\n`;
    if (matching.length > 0) {
      matching.forEach(m => {
        response += `- **${m.title}** (৳${Number(m.price).toLocaleString()} in ${m.location}) -> [View Details](/product/${m.id})\n`;
      });
    } else {
      response += `Currently, we have properties in popular areas like Gulshan, Dhanmondi, and Uttara. You can browse them on our home page!`;
    }
  } else if (query.includes('furniture') || query.includes('sofa') || query.includes('chair') || query.includes('table')) {
    response += `🛋️ Seeking premium furniture? Here are some top listings available right now:\n\n`;
    if (matching.length > 0) {
      matching.forEach(m => {
        response += `- **${m.title}** (৳${Number(m.price).toLocaleString()}) -> [View Details](/product/${m.id})\n`;
      });
    } else {
      response += `Check out our Furniture section for high-quality sofas, beds, and tables from verified sellers.`;
    }
  } else if (query.includes('appliance') || query.includes('fridge') || query.includes('tv') || query.includes('washing')) {
    response += `📺 Need home appliances? Here's what we have matching your query:\n\n`;
    if (matching.length > 0) {
      matching.forEach(m => {
        response += `- **${m.title}** (৳${Number(m.price).toLocaleString()}) -> [View Details](/product/${m.id})\n`;
      });
    } else {
      response += `We feature refrigerators, smart televisions, and other appliances from popular brands.`;
    }
  } else {
    response = `Hi! I am the **Thikana AI Assistant**. I can help you find apartments for rent or sale, and recommend furniture or home appliances. Try asking something like:
- "Find me a rental flat in Dhaka"
- "Recommend a comfortable sofa for my living room"
- "Are there any smart televisions for sale?"`;
  }

  return response;
}

async function generateChatbotResponse(message, history = [], listings = []) {
  try {
    const systemPrompt = `You are "Thikana AI Assistant", an intelligent real estate and home setup recommendation agent. You help users search, choose, and buy/rent flats, furniture, and appliances in Bangladesh. You are friendly, concise, and helpful. You will be provided with a list of active listings on the platform. Whenever relevant, refer the user to specific listings by title and ID in markdown links format, e.g. "[Gulshan Flat](/product/123)". Do not make up listings that are not in the list. Refer users directly to the platform options.`;
    
    // Transform history to Gemini format:
    // history: [{ sender: 'user'|'bot', text: '...' }]
    // Gemini roles: 'user', 'model'
    const contents = history.map(h => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // Append context of active listings to the user's latest query
    const activeListingsText = listings.slice(0, 15).map(l => 
      `Listing ID: ${l.id}, Category: ${l.category}, Title: "${l.title}", Price: ৳${l.price}, Location: "${l.location}", Beds: ${l.attributes?.beds || 'N/A'}`
    ).join('\n');

    const userQuery = `Available platform listings:\n${activeListingsText}\n\nUser Question: "${message}"`;
    contents.push({ role: 'user', parts: [{ text: userQuery }] });

    return await callGemini(contents, systemPrompt, false);
  } catch (err) {
    console.error('[aiService] generateChatbotResponse failed, using fallback:', err.message);
    return generateChatbotResponseFallback(message, listings);
  }
}

module.exports = {
  analyzeSentiment,
  generateComparisonSummary,
  generateRecommendations,
  generateChatbotResponse,
};
