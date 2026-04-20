// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, collection, getDocs, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPWbnkNQCUjTzOZWC03a6Ccc2nY1bHHIw",
  authDomain: "free-free-e868b.firebaseapp.com",
  databaseURL: "https://free-free-e868b-default-rtdb.firebaseio.com",
  projectId: "free-free-e868b",
  storageBucket: "free-free-e868b.firebasestorage.app",
  messagingSenderId: "379376493226",
  appId: "1:379376493226:web:6852722a6cba42e45326d3",
  measurementId: "G-6Z5XFDEE03"
};

// Initialize Firebase
let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// State Variables
let currentCategory = null;
let selectedEmoteId = null;
let selectedServerUrl = null;
let uidCount = 1;
const maxUids = 5;
let toastQueue = [];
let isProcessingToast = false;

// Check Authentication
if (!sessionStorage.getItem('auth')) {
    window.location.href = 'index.html';
}

// Logout Handler
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    sessionStorage.removeItem('auth');
    window.location.href = 'index.html';
}); 

// Loader Functions
function showLoader() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.classList.add('hidden');
}

// ===== TOAST NOTIFICATION SYSTEM =====
function showToast(message, type = 'success') {
    console.log(`📢 Toast: ${message} (${type})`);
    toastQueue.push({ message, type });
    if (!isProcessingToast) {
        processToastQueue();
    }
}

async function processToastQueue() {
    if (toastQueue.length === 0) {
        isProcessingToast = false;
        return;
    }
    
    isProcessingToast = true;
    
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    });
    
    const { message, type } = toastQueue.shift();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;
    
    const container = document.getElementById('toastContainer');
    if (container) {
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
                if (toastQueue.length > 0) {
                    processToastQueue();
                } else {
                    isProcessingToast = false;
                }
            }, 300);
        }, 3000);
    }
}

// ===== LOAD SERVERS FROM FIREBASE =====
async function loadServers() {
    try {
        console.log('🔄 Loading servers from Firebase...');
        
        if (!db) {
            console.error('❌ Database not initialized');
            showToast('Database connection failed', 'error');
            return;
        }
        
        const serversCol = collection(db, 'servers');
        const serverSnapshot = await getDocs(serversCol);
        
        const indianSelect = document.getElementById('indianServerSelect');
        const bangladeshSelect = document.getElementById('bangladeshServerSelect');
        const otherSelect = document.getElementById('otherServerSelect');
        
        if (!indianSelect || !bangladeshSelect || !otherSelect) {
            console.error('❌ Server select elements not found');
            return;
        }
        
        // Clear existing options
        indianSelect.innerHTML = '<option value="">Select Indian Server...</option>';
        bangladeshSelect.innerHTML = '<option value="">Select Bangladesh Server...</option>';
        otherSelect.innerHTML = '<option value="">Select Other Server...</option>';
        
        const servers = [];
        serverSnapshot.forEach(doc => {
            const serverData = doc.data();
            console.log('📡 Found server:', serverData);
            servers.push({ id: doc.id, ...serverData });
        });
        
        // Sort by order
        servers.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Categorize servers based on region field
        let indianCount = 0, bangladeshCount = 0, otherCount = 0;
        
        servers.forEach(server => {
            const option = document.createElement('option');
            option.value = server.baseUrl;
            option.textContent = server.name;
            
            // Use the region field from database for categorization
            if (server.region === 'indian') {
                indianSelect.appendChild(option);
                indianCount++;
                console.log('✅ Added to Indian:', server.name);
            } else if (server.region === 'bangladesh') {
                bangladeshSelect.appendChild(option);
                bangladeshCount++;
                console.log('✅ Added to Bangladesh:', server.name);
            } else if (server.region === 'other') {
                otherSelect.appendChild(option);
                otherCount++;
                console.log('✅ Added to Other:', server.name);
            } else {
                // Fallback for old servers without region field
                otherSelect.appendChild(option);
                otherCount++;
                console.log('⚠️ Added to Other (no region):', server.name);
            }
        });

        console.log('📊 Server Distribution:', {
            indian: indianCount,
            bangladesh: bangladeshCount,
            other: otherCount
        });

        // Check if any category is empty and show message
        if (indianSelect.options.length === 1) {
            indianSelect.innerHTML = '<option value="">No Indian servers available</option>';
        }
        if (bangladeshSelect.options.length === 1) {
            bangladeshSelect.innerHTML = '<option value="">No Bangladesh servers available</option>';
        }
        if (otherSelect.options.length === 1) {
            otherSelect.innerHTML = '<option value="">No other servers available</option>';
        }
        
        const totalServers = servers.length;
        console.log(`✅ Loaded ${totalServers} servers across 3 categories`);
        showToast(`Loaded ${totalServers} servers in 3 categories`, 'success');
        
    } catch (error) {
        console.error('❌ Server load error:', error);
        showToast('Error loading servers: ' + error.message, 'error');
    }
}
// Server Selection Handler for all 3 dropdowns
function setupServerSelection() {
    const indianSelect = document.getElementById('indianServerSelect');
    const bangladeshSelect = document.getElementById('bangladeshServerSelect');
    const otherSelect = document.getElementById('otherServerSelect');
    const statServer = document.getElementById('statServer');
    
    function handleServerChange(e) {
        selectedServerUrl = e.target.value;
        const selectedText = e.target.options[e.target.selectedIndex].text;
        
        if (statServer) {
            statServer.textContent = selectedText || 'Not Selected';
        }
        
        console.log('🎯 Server selected:', selectedText, selectedServerUrl);
        
        if (selectedServerUrl) {
            showToast(`Server "${selectedText}" selected`, 'success');
            
            // Reset other dropdowns
            if (e.target === indianSelect) {
                bangladeshSelect.value = '';
                otherSelect.value = '';
            } else if (e.target === bangladeshSelect) {
                indianSelect.value = '';
                otherSelect.value = '';
            } else if (e.target === otherSelect) {
                indianSelect.value = '';
                bangladeshSelect.value = '';
            }
        }
    }
    
    if (indianSelect) indianSelect.addEventListener('change', handleServerChange);
    if (bangladeshSelect) bangladeshSelect.addEventListener('change', handleServerChange);
    if (otherSelect) otherSelect.addEventListener('change', handleServerChange);
}

// ===== LOAD CATEGORIES FROM FIREBASE =====
async function loadCategories() {
    try {
        console.log('🔄 Loading categories...');
        
        if (!db) {
            console.error('❌ Database not initialized');
            return;
        }
        
        const categoriesCol = collection(db, 'categories');
        const categorySnapshot = await getDocs(categoriesCol);
        const categoryTabs = document.getElementById('categoryTabs');
        
        if (!categoryTabs) {
            console.error('❌ Category tabs element not found');
            return;
        }
        
        categoryTabs.innerHTML = '';
        
        const categories = [];
        categorySnapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by order
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        if (categories.length === 0) {
            console.log('⚠️ No categories found, using defaults');
            categoryTabs.innerHTML = `
                <button class="category-tab active" data-category="HOT">🔥 HOT</button>
                <button class="category-tab" data-category="EVO">⚡ EVO</button>
                <button class="category-tab" data-category="RARE">💎 RARE</button>
            `;
            currentCategory = 'HOT';
        } else {
            categories.forEach((cat, index) => {
                const btn = document.createElement('button');
                btn.className = 'category-tab' + (index === 0 ? ' active' : '');
                btn.dataset.category = cat.id;
                btn.textContent = `${cat.icon || ''} ${cat.name}`;
                btn.addEventListener('click', () => switchCategory(cat.id, btn));
                categoryTabs.appendChild(btn);
                
                if (index === 0) currentCategory = cat.id;
            });
            console.log(`✅ Loaded ${categories.length} categories`);
        }
        
        // Add click listeners for default tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.dataset.category;
                loadEmotes(currentCategory);
            });
        });
        
        loadEmotes(currentCategory);
        
    } catch (error) {
        console.error('❌ Category load error:', error);
        const categoryTabs = document.getElementById('categoryTabs');
        if (categoryTabs) {
            categoryTabs.innerHTML = `
                <button class="category-tab active" data-category="HOT">🔥 HOT</button>
                <button class="category-tab" data-category="EVO">⚡ EVO</button>
            `;
        }
        currentCategory = 'HOT';
        loadEmotes('HOT');
    }
}

function switchCategory(category, btnElement) {
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    btnElement.classList.add('active');
    currentCategory = category;
    loadEmotes(category);
    console.log('🔄 Switched to category:', category);
}

// ===== LOAD EMOTES FROM FIREBASE =====
async function loadEmotes(category) {
    try {
        console.log('🔄 Loading emotes for category:', category);
        
        if (!db) {
            console.error('❌ Database not initialized');
            return;
        }
        
        const emotesCol = collection(db, 'emotes');
        const emoteSnapshot = await getDocs(emotesCol);
        const emoteGrid = document.getElementById('emoteGrid');
        
        if (!emoteGrid) {
            console.error('❌ Emote grid element not found');
            return;
        }
        
        emoteGrid.innerHTML = '';
        
        let count = 0;
        emoteSnapshot.forEach(doc => {
            const emote = doc.data();
            if (emote.category === category) {
                const card = document.createElement('div');
                card.className = 'emote-card';
                card.innerHTML = `
                    <div class="emote-image-wrapper">
                        <img src="${emote.imageUrl}" alt="${emote.emoteId}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext fill=%22%23666%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E?%3C/text%3E%3C/svg%3E'">
                    </div>
                    <p class="emote-name">${emote.emoteId}</p>
                `;
                card.addEventListener('click', () => sendEmoteInstantly(emote.emoteId, card));
                emoteGrid.appendChild(card);
                count++;
            }
        });

        if (count === 0) {
            emoteGrid.innerHTML = '<div class="no-emotes">No emotes in this category</div>';
            console.log('⚠️ No emotes found for category:', category);
        } else {
            console.log(`✅ Loaded ${count} emotes for ${category}`);
        }
        
    } catch (error) {
        console.error('❌ Emote load error:', error);
        const emoteGrid = document.getElementById('emoteGrid');
        if (emoteGrid) {
            emoteGrid.innerHTML = '<div class="no-emotes">Error loading emotes</div>';
        }
    }
}

// ===== ENHANCED SEND EMOTE FUNCTION - SUPER FAST & OPTIMIZED =====
async function sendEmoteInstantly(emoteId, cardElement) {
    const startTime = performance.now();
    console.log('⚡ INSTANT SEND:', emoteId);
    
    // ✅ STEP 1: INSTANT UI UPDATE (0ms delay)
    selectedEmoteId = emoteId;
    const statEmote = document.getElementById('statEmote');
    if (statEmote) statEmote.textContent = emoteId;
    
    document.querySelectorAll('.emote-card').forEach(c => c.classList.remove('selected'));
    cardElement.classList.add('selected');
    
    // ✅ STEP 2: PRE-VALIDATED DATA (cached references)
    const teamCodeInput = document.getElementById('teamCode');
    const uid1Input = document.getElementById('uid1');
    
    // Quick validation with early return
    if (!selectedServerUrl) {
        showToast('⚠️ Select server first', 'error');
        return;
    }
    
    if (!teamCodeInput || !uid1Input) {
        showToast('❌ Form error', 'error');
        return;
    }
    
    const tc = teamCodeInput.value.trim();
    const uid1 = uid1Input.value.trim();
    
    if (!tc) {
        showToast('⚠️ Enter team code', 'error');
        return;
    }
    
    if (!uid1 || !/^[0-9]{9,12}$/.test(uid1)) {
        showToast('⚠️ Valid UID required (9-12 digits)', 'error');
        return;
    }
    
    // ✅ STEP 3: COLLECT UIDs IN SINGLE LOOP (optimized)
    const params = new URLSearchParams({
        server: selectedServerUrl,
        tc: tc,
        uid1: uid1,
        emote_id: emoteId
    });
    
    // Add additional UIDs efficiently
    for (let i = 2; i <= maxUids; i++) {
        const inp = document.getElementById(`uid${i}`);
        if (inp?.value.trim() && /^[0-9]{9,12}$/.test(inp.value.trim())) {
            params.append(`uid${i}`, inp.value.trim());
        }
    }
    
    // ✅ STEP 4: BUILD URL (single operation)
    const url = `/.netlify/functions/send-emote?${params.toString()}`;
    
    console.log('🌐 API URL Ready:', url);
    
    // ✅ STEP 5: SHOW MINIMAL LOADER (optional, can remove for even faster feel)
    showLoader();
    
    // ✅ STEP 6: PARALLEL API CALL WITH TIMEOUT PROTECTION
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
        // Fetch with keepalive for better performance
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            keepalive: true,
            priority: 'high'
        });
        
        clearTimeout(timeoutId);
        
        const result = await response.json();
        
        hideLoader();
        
        const elapsed = (performance.now() - startTime).toFixed(0);
        
        if (result.success) {
            console.log(`✅ SUCCESS in ${elapsed}ms:`, result);
            showToast(`✓ ${emoteId} sent (${elapsed}ms)`, 'success');
        } else {
            console.error('❌ API ERROR:', result);
            showToast(`✗ ${result.error || 'Failed'}`, 'error');
        }
        
    } catch (error) {
        clearTimeout(timeoutId);
        hideLoader();
        
        if (error.name === 'AbortError') {
            console.error('⏱️ TIMEOUT after 10s');
            showToast('⏱️ Request timeout', 'error');
        } else {
            console.error('❌ NETWORK ERROR:', error);
            showToast(`❌ ${error.message}`, 'error');
        }
    }
}

// ===== UID MANAGEMENT =====
const addUidBtn = document.getElementById('addUidBtn');
if (addUidBtn) {
    addUidBtn.addEventListener('click', () => {
        if (uidCount < maxUids) {
            uidCount++;
            addUidField(uidCount);
            const statUids = document.getElementById('statUids');
            if (statUids) {
                statUids.textContent = uidCount;
            }
            
            if (uidCount >= maxUids) {
                addUidBtn.disabled = true;
                addUidBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" stroke-width="2"/></svg> MAX UIDs ADDED';
            }
        }
    });
}

function addUidField(number) {
    const container = document.getElementById('uidContainer');
    if (!container) return;
    
    const uidBox = document.createElement('div');
    uidBox.className = 'input-group-box uid-field';
    uidBox.id = `uidBox${number}`;
    uidBox.innerHTML = `
        <label>TARGET UID ${number} <span style="color: var(--text-gray); font-size: 11px;">(Optional)</span></label>
        <div style="display: flex; gap: 10px;">
            <input type="text" id="uid${number}" placeholder="Enter UID (9-12 digits)" class="config-input uid-input" pattern="[0-9]{9,12}">
            <button class="remove-uid-btn" onclick="window.removeUid(${number})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                </svg>
            </button>
        </div>
    `;
    container.appendChild(uidBox);
}

window.removeUid = function(number) {
    const uidBox = document.getElementById(`uidBox${number}`);
    if (uidBox) {
        uidBox.remove();
        uidCount--;
        const statUids = document.getElementById('statUids');
        if (statUids) {
            statUids.textContent = uidCount;
        }
        
        const addBtn = document.getElementById('addUidBtn');
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" stroke-width="2"/></svg> ADD UID';
        }
    }
};

// ===== MAINTENANCE CHECK =====
async function checkMaintenance() {
    try {
        if (!db) return;
        
        const docRef = doc(db, 'settings', 'maintenance');
        const docSnap = await getDoc(docRef);
        
        const overlay = document.getElementById('maintenanceOverlay');
        const msg = document.getElementById('maintenanceMsg');
        
        if (docSnap.exists() && docSnap.data().enabled) {
            if (msg) msg.textContent = docSnap.data().message;
            if (overlay) overlay.classList.remove('hidden');
        }
        
        // Real-time listener
        onSnapshot(docRef, (doc) => {
            if (doc.exists() && doc.data().enabled) {
                if (msg) msg.textContent = doc.data().message;
                if (overlay) overlay.classList.remove('hidden');
            } else {
                if (overlay) overlay.classList.add('hidden');
            }
        });
    } catch (error) {
        console.log('⚠️ Maintenance check skipped:', error.message);
    }
}

// ===== LOAD FOOTER LINKS =====
async function loadFooterLinks() {
    try {
        if (!db) return;
        
        const docRef = doc(db, 'settings', 'footerLinks');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const links = docSnap.data();
            const telegram = document.getElementById('footerTelegram');
            const github = document.getElementById('footerGithub');
            const discord = document.getElementById('footerDiscord');
            const youtube = document.getElementById('footerYoutube');
            const maintenanceTG = document.getElementById('maintenanceTG');
            
            if (telegram) telegram.href = links.telegram || '#';
            if (github) github.href = links.github || '#';
            if (discord) discord.href = links.discord || '#';
            if (youtube) youtube.href = links.youtube || '#';
            if (maintenanceTG) maintenanceTG.href = links.telegram || '#';
        }
    } catch (error) {
        console.log('⚠️ Footer links not configured');
    }
}

// ===== INITIALIZE DASHBOARD =====
async function initializeDashboard() {
    console.log('🔥 NOVRA X Dashboard Initializing...');
    console.log('📱 Firebase Project:', firebaseConfig.projectId);
    
    try {
        await checkMaintenance();
        await loadServers();
        setupServerSelection();
        await loadCategories();
        await loadFooterLinks();
        
        console.log('✅ NOVRA X Dashboard Ready!');
        console.log('⚡ INSTANT SEND MODE ACTIVATED!');
        
        setTimeout(() => {
            showToast('Dashboard loaded successfully!', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        showToast('Dashboard initialization failed. Check console.', 'error');
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    initializeDashboard();
}