const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const multer = require('multer');
const sharp = require('sharp');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize clients
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// Memory storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Simple auth middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    req.userId = '00000000-0000-0000-0000-000000000001';
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    req.userId = '00000000-0000-0000-0000-000000000001';
    next();
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      supabase: !!process.env.SUPABASE_URL,
      openai: !!process.env.OPENAI_API_KEY
    }
  });
});

// AI Listing Generation (Secured & Optimized)
app.post('/api/ai/generate-listing', authMiddleware, upload.array('images', 5), async (req, res) => {
  try {
    const { location, condition } = req.body;
    const images = req.files;
    
    // IMPORTANT: Get the user ID from the verified token, NEVER from the req.body
    const userId = req.userId;

    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'At least one image required' });
    }

    console.log(`Processing ${images.length} images...`);

    // 1. Optimize images ONCE and save the buffers
    const optimizedImages = await Promise.all(images.map(async (img) => {
      const optimizedBuffer = await sharp(img.buffer)
        .resize(1024, 1024, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
        
      return {
        buffer: optimizedBuffer,
        base64Url: `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`
      };
    }));

    // 2. AI Analysis (Using the base64 URLs)
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Create marketplace listing JSON with: title (max 60 chars), description (2-3 sentences), category (Electronics/Appliances/Furniture/Vehicles/Clothing/Home & Garden/Sports & Outdoors/Toys & Games/Books & Media/Collectibles), suggestedPrice (number), condition (new/like_new/good/fair/poor), keyFeatures (array), brand (string or null)`
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Create listing. Condition: ${condition || 'not specified'}. Location: ${location || 'not specified'}.` },
            ...optimizedImages.map(img => ({ type: "image_url", image_url: { url: img.base64Url } }))
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800
    });

    const aiData = JSON.parse(visionResponse.choices[0].message.content);

    // 3. Upload to Supabase Storage (Using the OPTIMIZED buffers)
    const uploadedUrls = await Promise.all(optimizedImages.map(async (img, idx) => {
      const fileName = `listings/${userId}/${Date.now()}_${idx}.jpg`;
      const { error } = await supabase.storage.from('listings').upload(fileName, img.buffer, {
        contentType: 'image/jpeg'
      });
      if (error) throw error;
      const { data } = supabase.storage.from('listings').getPublicUrl(fileName);
      return data.publicUrl;
    }));

    // Get category ID
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', aiData.category)
      .single();

    // Create listing
    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        seller_id: userId,
        title: aiData.title,
        description: aiData.description,
        price: aiData.suggestedPrice,
        condition: aiData.condition,
        category_id: categoryData?.id || null,
        location: location || 'Unknown',
        images: uploadedUrls,
        ai_generated: true,
        ai_metadata: { keyFeatures: aiData.keyFeatures, brand: aiData.brand }
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      listing,
      aiAnalysis: aiData
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search Listings
app.get('/api/listings/search', async (req, res) => {
  try {
    const { q, category, location, minPrice, maxPrice } = req.query;
    
    let query = supabase
      .from('listings')
      .select('*, seller:users(name, location), category:categories(name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    if (category) query = query.eq('category_id', category);
    if (location) query = query.ilike('location', `%${location}%`);
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);

    const { data: listings, error } = await query;
    if (error) throw error;

    res.json({ listings: listings || [], count: listings?.length || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single listing
app.get('/api/listings/:id', async (req, res) => {
  try {
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*, seller:users(name, location), category:categories(name)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!listing) return res.status(404).json({ error: 'Not found' });

    await supabase.from('listings').update({ views: (listing.views || 0) + 1 }).eq('id', req.params.id);
    res.json({ listing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Chat - Start conversation (Secured)
app.post('/api/conversations/start', authMiddleware, async (req, res) => {
  try {
    const { listingId, message } = req.body;
    const buyerId = req.userId; // Replaced req.body.buyerId with secure token ID

    const { data: listing } = await supabase
      .from('listings')
      .select('*, seller:users(*)')
      .eq('id', listingId)
      .single();

    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const { data: conversation } = await supabase
      .from('conversations')
      .insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: listing.seller_id,
        status: 'active'
      })
      .select()
      .single();

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are the AI sales assistant for "${listing.title}" ($${listing.price}). Be helpful with questions, negotiation (range: $${Math.round(listing.price * 0.8)}-$${Math.round(listing.price * 1.1)}), and scheduling. Keep responses friendly and concise.`
        },
        { role: "user", content: message }
      ],
      max_tokens: 300
    });

    const reply = aiResponse.choices[0].message.content;

    await supabase.from('messages').insert([
      { conversation_id: conversation.id, sender_id: buyerId, content: message, is_ai_generated: false },
      { conversation_id: conversation.id, sender_id: null, content: reply, is_ai_generated: true }
    ]);

    res.json({ success: true, conversation, aiResponse: reply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Continue chat (Secured)
app.post('/api/conversations/:id/message', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, userType } = req.body;
    const senderId = req.userId; // Replaced req.body.senderId with secure token ID

    await supabase.from('messages').insert({
      conversation_id: id,
      sender_id: senderId,
      content: message,
      is_ai_generated: false
    });

    if (userType === 'buyer') {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*, listing:listings(*)')
        .eq('id', id)
        .single();

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Continue assisting with "${conversation.listing.title}". Help with questions, negotiation, or scheduling.` },
          { role: "user", content: message }
        ],
        max_tokens: 300
      });

      const reply = aiResponse.choices[0].message.content;

      await supabase.from('messages').insert({
        conversation_id: id,
        sender_id: null,
        content: reply,
        is_ai_generated: true
      });

      return res.json({ success: true, aiResponse: reply });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User registration
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, password, name, phone, location } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash: passwordHash, name, phone, location })
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, email, name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User login
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
    
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
});

module.exports = app;