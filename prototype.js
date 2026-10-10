
window.showAppAlert = function(title, message, type = "error") {
    if (window.thDict && window.currentLang === "th") { title = window.thDict[title] || title; message = window.thDict[message] || message; }
    return new Promise((resolve) => {
        const existing = document.getElementById("app-alert-overlay");
        if(existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "app-alert-overlay";
        overlay.className = "fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center opacity-0 transition-opacity duration-300 backdrop-blur-sm";
        
        let colorClass = type === "error" ? "text-[#ff3b30]" : "text-[#007aff]";
        if(type === "success") colorClass = "text-[#34c759]";

        overlay.innerHTML = `
            <div class="bg-white/95 backdrop-blur-xl w-[270px] rounded-[14px] text-center transform scale-95 transition-transform duration-300 shadow-2xl flex flex-col">
                <div class="p-4 pt-5 pb-4">
                    <h3 class="text-[17px] font-semibold text-black mb-1 leading-snug">${title}</h3>
                    <p class="text-[13px] text-black/70 leading-tight px-2">${message}</p>
                </div>
                <div class="border-t border-black/10 flex">
                    <button id="app-alert-close" class="w-full py-3 text-[17px] font-semibold ${colorClass} hover:bg-black/5 active:bg-black/10 transition-colors rounded-b-[14px]">${window.currentLang === "th" ? "ปิด" : "Close"}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.remove("opacity-0");
            overlay.firstElementChild.classList.remove("scale-95");
        });

        document.getElementById("app-alert-close").onclick = () => {
            overlay.classList.add("opacity-0");
            overlay.firstElementChild.classList.add("scale-95");
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 300);
        };
    });
};

window.showAppConfirm = function(title, message) {
    if (window.thDict && window.currentLang === "th") { title = window.thDict[title] || title; message = window.thDict[message] || message; }
    return new Promise((resolve) => {
        const existing = document.getElementById("app-alert-overlay");
        if(existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "app-alert-overlay";
        overlay.className = "fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center opacity-0 transition-opacity duration-300 backdrop-blur-sm";
        
        overlay.innerHTML = `
            <div class="bg-white/95 backdrop-blur-xl w-[270px] rounded-[14px] text-center transform scale-95 transition-transform duration-300 shadow-2xl flex flex-col">
                <div class="p-4 pt-5 pb-4">
                    <h3 class="text-[17px] font-semibold text-black mb-1 leading-snug">${title}</h3>
                    <p class="text-[13px] text-black/70 leading-tight px-2">${message}</p>
                </div>
                <div class="border-t border-black/10 flex">
                    <button id="app-confirm-cancel" class="w-1/2 py-3 text-[17px] text-[#007aff] border-r border-black/10 hover:bg-black/5 active:bg-black/10 transition-colors rounded-bl-[14px]">${window.currentLang === "th" ? "ยกเลิก" : "Cancel"}</button>
                    <button id="app-confirm-ok" class="w-1/2 py-3 text-[17px] font-semibold text-[#ff3b30] hover:bg-black/5 active:bg-black/10 transition-colors rounded-br-[14px]">${window.currentLang === "th" ? "ตกลง" : "Confirm"}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.remove("opacity-0");
            overlay.firstElementChild.classList.remove("scale-95");
        });

        const closeWith = (val) => {
            overlay.classList.add("opacity-0");
            overlay.firstElementChild.classList.add("scale-95");
            setTimeout(() => {
                overlay.remove();
                resolve(val);
            }, 300);
        };

        document.getElementById("app-confirm-cancel").onclick = () => closeWith(false);
        document.getElementById("app-confirm-ok").onclick = () => closeWith(true);
    });
};

const SUPABASE_URL = 'https://ajsrjmzrzdwocsqzimhu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqc3JqbXpyemR3b2NzcXppbWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDc0NjMsImV4cCI6MjEwNTkyMzQ2M30.WMAY4XWhhOE17nG2kojfRZXtyxTXLbjecS1bpYRorWU';
let supabaseClient; try { supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch(e) { alert('Supabase Load Error: ' + e.message); }

const state = {
    requests: [],
    isLoading: false,
    currentUser: null, // { username: '...', role: 'user' | 'mech' | 'admin' }
    searchQuery: '',
    filterCat: 'All',
    currentEditId: null
};

let currentView = 'login';
let currentImageBase64 = '';
let tempRatings = {};

const savedUser = localStorage.getItem('smartCmuUser');
if (savedUser) {
    state.currentUser = JSON.parse(savedUser);
    if(state.currentUser.role === 'admin') currentView = 'dashboard';
    else if(state.currentUser.role === 'mech') currentView = 'tech';
    else currentView = 'submit';
}

const getStatusBadge = (status) => {
    if(status === 'pending') return `<span class="status-badge status-pending bg-gray-100 border border-gray-200 shadow-sm"><i class="fas fa-circle-notch fa-spin mr-1"></i> WAITING...</span>`;
    if(status === 'progress') return `<span class="status-badge status-progress">In Progress</span>`;
    if(status === 'completed') return `<span class="status-badge status-completed">Completed</span>`;
    if(status === 'cancelled') return `<span class="status-badge border-red-200 bg-red-50 text-red-600">Cancelled</span>`;
    return `<span class="status-badge">${status}</span>`;
};

const renderStepper = (status) => {
    if (status === 'cancelled') return '';
    const steps = ['pending', 'progress', 'completed'];
    const stepNames = ['Pending', 'Progress', 'Completed'];
    const currentIndex = Math.max(0, steps.indexOf(status));
    let html = `<div class="mt-5 mb-2 flex items-start justify-between w-full px-4">`;
    steps.forEach((step, index) => {
        const isPast = index < currentIndex;
        const isActive = index === currentIndex;
        let circleClass = '', icon = '', textClass = '';
        if (isPast || (isActive && status === 'completed')) {
            circleClass = 'bg-black border-black text-white';
            icon = '<i class="fas fa-check text-[10px]"></i>';
            textClass = 'text-black font-bold';
        } else if (isActive) {
            circleClass = 'bg-white border-black text-black ring-2 ring-black ring-offset-2';
            icon = '<div class="w-2 h-2 rounded-full bg-black animate-pulse"></div>';
            textClass = 'text-black font-bold';
        } else {
            circleClass = 'bg-white border-gray-300 text-gray-300';
            icon = '<div class="w-2 h-2 rounded-full bg-gray-200"></div>';
            textClass = 'text-gray-400 font-medium';
        }
        html += `<div class="flex flex-col items-center relative z-10 w-12 bg-white">
            <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${circleClass}">
                ${icon}
            </div>
            <span class="text-[8px] uppercase mt-2 tracking-widest text-center ${textClass}">${stepNames[index]}</span>
        </div>`;
        if (index < steps.length - 1) {
            html += `<div class="flex-auto h-[2px] mt-3 -mx-4 z-0 ${index < currentIndex ? 'bg-black' : 'bg-gray-200'}"></div>`;
        }
    });
    html += `</div>`;
    return html;
};
// Filter logic for Tech and Admin views
const getFilteredRequests = (requests) => {
    return requests.filter(r => {
        const matchCat = state.filterCat === 'All' || r.category === state.filterCat;
        const search = state.searchQuery.toLowerCase();
        const matchSearch = r.id.toLowerCase().includes(search) || r.location.toLowerCase().includes(search) || r.desc.toLowerCase().includes(search);
        return matchCat && matchSearch;
    });
};

const searchFilterUI = () => `
    <div class="flex space-x-2 mb-4 bg-gray-100 p-3 rounded-2xl border-none">
        <input type="text" placeholder="Search ID, Location..." class="input-minimal text-xs py-2 w-2/3" onkeyup="handleSearch(this.value)" value="${state.searchQuery}">
        <select class="input-minimal text-xs py-2 w-1/3" onchange="handleFilter(this.value)">
            <option value="All" ${state.filterCat==='All'?'selected':''}>All</option>
            <option value="Electrical" ${state.filterCat==='Electrical'?'selected':''}>Electrical</option>
            <option value="Plumbing" ${state.filterCat==='Plumbing'?'selected':''}>Plumbing</option>
            <option value="Carpentry" ${state.filterCat==='Carpentry'?'selected':''}>Carpentry</option>
            <option value="General" ${state.filterCat==='General'?'selected':''}>General</option>
        </select>
    </div>
`;

const views = {
    login: () => `
        <div class="flex flex-col h-full justify-center px-4">
            <h2 class="text-2xl font-bold mb-2 tracking-tight uppercase text-center">Login</h2>
            <p class="text-xs text-gray-500 text-center mb-8 uppercase tracking-widest">PROTOTYPE CMU MAINTENANCE</p>
            <form id="loginForm" onsubmit="handleLogin(event)" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Username</label>
                    <input type="text" id="login-username" class="input-minimal" required>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Password</label>
                    <input type="password" id="login-password" class="input-minimal" required>
                    <div class="text-right mt-3">
                        <a href="#" onclick="switchView('forgot')" class="text-[10px] text-gray-500 font-bold hover:text-black">Forgot Password?</a>
                    </div>
                </div>
                <button type="submit" class="btn-minimal mt-4">Log In</button>
            </form>
            <div class="text-center mt-6 border-t border-gray-200 pt-6">
                <p class="text-xs text-gray-400 mb-3">Don't have an account?</p>
                <button type="button" onclick="switchView('register')" class="w-full text-xs font-bold uppercase tracking-widest text-black border border-black rounded-full py-3 hover:bg-black hover:text-white transition">Register Here</button>
            </div>
        </div>
    `,
    forgot: () => `
        <div class="flex flex-col h-full justify-center px-4">
            <h2 class="text-2xl font-bold mb-2 tracking-tight uppercase text-center">Change Password</h2>
            <p class="text-xs text-gray-500 text-center mb-6 uppercase tracking-widest">PROTOTYPE CMU MAINTENANCE</p>
            <form onsubmit="handleForgotPassword(event)" class="space-y-3">
                <div>
                    <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-500">Username</label>
                    <input type="text" id="forgot-username" class="input-minimal py-2" required>
                </div>
                <div>
                    <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-500">Old Password</label>
                    <input type="password" id="forgot-old-password" class="input-minimal py-2" required>
                </div>
                <div>
                    <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-500">New Password</label>
                    <input type="password" id="forgot-password" class="input-minimal py-2" required>
                </div>
                <div>
                    <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-500">Confirm New Password</label>
                    <input type="password" id="forgot-confirm-password" class="input-minimal py-2" required>
                </div>
                <button type="submit" class="btn-minimal mt-4">Update Password</button>
                <div class="text-center mt-3">
                    <button type="button" onclick="switchView('login')" class="text-xs font-bold uppercase text-gray-400 hover:text-black mt-1">← Back to Login</button>
                </div>
            </form>
        </div>
    `,
    register: () => `
        <div class="flex flex-col h-full justify-center px-4">
            <h2 class="text-2xl font-bold mb-2 tracking-tight uppercase text-center">Register</h2>
            <form onsubmit="handleRegister(event)" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Username</label>
                    <input type="text" id="reg-username" class="input-minimal" required>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Password</label>
                    <input type="password" id="reg-password" class="input-minimal" required>
                </div>
                <button type="submit" class="btn-minimal mt-6">Create Account</button>
                <div class="text-center mt-4">
                    <button type="button" onclick="switchView('login')" class="text-xs font-bold uppercase text-gray-400 hover:text-black mt-2">← Back to Login</button>
                </div>
            </form>
        </div>
    `,
    profile: () => {
        let chatHistoryHtml = '';
        if (state.currentUser.role !== 'admin') {
            const chatRequests = state.requests.filter(r => {
                if (!r.assignedTo) return false;
                if (state.currentUser.role === 'user') return r.requester === state.currentUser.username;
                if (state.currentUser.role === 'mech') return r.assignedTo === state.currentUser.username;
                return true;
            });
            chatHistoryHtml = chatRequests.length > 0 ? chatRequests.map(r => `
                <div onclick="openChat('${r.id}')" class="bg-white rounded-2xl p-4 mb-2 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg">
                            ${state.currentUser.role === 'user' ? r.assignedTo.charAt(0).toUpperCase() : r.requester.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="font-bold text-[13px] tracking-tight text-black uppercase">${r.id} - ${r.category}</p>
                            <p class="text-[11px] text-gray-500 mt-0.5">${window.currentLang === 'th' ? (state.currentUser.role === 'user' ? 'ช่าง' : 'ผู้แจ้ง') : (state.currentUser.role === 'user' ? 'Mech' : 'User')}: <span class="font-bold text-black">${state.currentUser.role === 'user' ? r.assignedTo : r.requester}</span></p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-300"></i>
                </div>
            `).join('') : `<p class="text-xs text-gray-400 italic text-center py-4">${window.currentLang === 'th' ? 'ยังไม่มีประวัติแชท' : 'No chat history yet'}</p>`;
        } else {
            const chatRequests = state.requests.filter(r => r.assignedTo);
            chatHistoryHtml = chatRequests.length > 0 ? chatRequests.map(r => `
                <div onclick="openChat('${r.id}')" class="bg-white rounded-2xl p-4 mb-2 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg">
                            <i class="fas fa-users"></i>
                        </div>
                        <div>
                            <p class="font-bold text-[13px] tracking-tight text-black uppercase">${r.id} - ${r.category}</p>
                            <p class="text-[11px] text-gray-500 mt-0.5">${window.currentLang === 'th' ? 'ผู้แจ้ง' : 'User'}: <span class="font-bold text-black">${r.requester}</span> | ${window.currentLang === 'th' ? 'ช่าง' : 'Mech'}: <span class="font-bold text-black">${r.assignedTo}</span></p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-300"></i>
                </div>
            `).join('') : `<p class="text-xs text-gray-400 italic text-center py-4">${window.currentLang === 'th' ? 'ยังไม่มีประวัติแชท' : 'No chat history yet'}</p>`;
        }

        return `
        <div class="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
            <h2 class="text-xl font-bold tracking-tight uppercase">My Profile</h2>
        </div>
        <div class="space-y-6">
            <div>
                <h3 class="text-[11px] font-bold uppercase tracking-widest mb-3 text-gray-500 pl-1">Recent Chats</h3>
                <div class="bg-gray-50 p-3 rounded-3xl min-h-[100px]">
                    ${chatHistoryHtml}
                </div>
            </div>
            <div class="card-minimal bg-gray-50">
                <p class="text-xs font-bold uppercase text-gray-500 mb-1">Logged in as</p>
                <p class="text-xl font-bold">${state.currentUser.username}</p>
                <p class="text-xs text-gray-400 uppercase tracking-widest mt-1">Role: ${state.currentUser.role}</p>
            </div>
            <form onsubmit="handleChangePassword(event)" class="space-y-3 bg-gray-50 p-5 rounded-3xl relative">
                <h3 class="text-sm font-bold uppercase mb-2">Change Password</h3>
                <input type="password" id="old-password" class="input-minimal text-sm py-2 bg-white" placeholder="Old password" required>
                <input type="password" id="new-password" class="input-minimal text-sm py-2 bg-white" placeholder="New password" required>
                <input type="password" id="confirm-password" class="input-minimal text-sm py-2 bg-white" placeholder="Confirm new password" required>
                <button type="submit" class="btn-minimal text-xs py-2 w-full mt-2">Update</button>
            </form>
            <button onclick="handleLogout()" class="w-full text-xs font-bold uppercase tracking-widest border border-red-500 text-red-500 rounded-full py-3 hover:bg-red-500 hover:text-white transition mt-8">
                Log Out
            </button>
        </div>
        `;
    },
    
    // ==========================================
    // FEATURE 1: DASHBOARD & ANALYTICS
    // ==========================================
    dashboard: () => {
        const total = state.requests.length;
        const pending = state.requests.filter(r => r.status === 'pending').length;
        const completed = state.requests.filter(r => r.status === 'completed').length;
        const cancelled = state.requests.filter(r => r.status === 'cancelled').length;
        
        let avgRating = 0;
        const rated = state.requests.filter(r => r.feedback);
        if(rated.length > 0) {
            avgRating = (rated.reduce((sum, r) => sum + r.feedback.rating, 0) / rated.length).toFixed(1);
        }

        const safeTotal = total || 1;
        const cPct = Math.round((completed / safeTotal) * 100);
        const pPct = Math.round((pending / safeTotal) * 100);
        const xPct = Math.round((cancelled / safeTotal) * 100);
        
        // CSS Pie Chart
        const pieStyle = `background: conic-gradient(#000 0% ${cPct}%, #666 ${cPct}% ${cPct + pPct}%, #ccc ${cPct + pPct}% 100%);`;

        return `
            <div class="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
                <h2 class="text-xl font-bold tracking-tight uppercase">Admin Dashboard</h2>
                <i class="fas fa-sync-alt cursor-pointer text-gray-400 hover:text-black" onclick="loadData()"></i>
            </div>
            
            <div class="card-minimal flex items-center justify-center p-4 mb-4">
                <div style="width: 100px; height: 100px; border-radius: 50%; ${pieStyle} border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"></div>
                <div class="ml-6 flex flex-col space-y-2">
                    <div class="flex items-center"><span class="w-3 h-3 bg-black mr-2"></span><span class="text-[10px] uppercase font-bold text-gray-600">Completed (${completed})</span></div>
                    <div class="flex items-center"><span class="w-3 h-3 bg-[#666] mr-2"></span><span class="text-[10px] uppercase font-bold text-gray-600">Pending (${pending})</span></div>
                    <div class="flex items-center"><span class="w-3 h-3 bg-[#ccc] mr-2"></span><span class="text-[10px] uppercase font-bold text-gray-600">Cancelled (${cancelled})</span></div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="card-minimal text-center p-4"><p class="text-3xl font-bold text-black">${total}</p><p class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Tasks</p></div>
                <div class="card-minimal text-center p-4"><p class="text-3xl font-bold text-black">${avgRating}<span class="text-sm text-gray-400">★</span></p><p class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Avg Rating</p></div>
            </div>
        `;
    },

    // ==========================================
    // FEATURE 4 & 5: ADMIN MANAGEMENT + SEARCH/FILTER
    // ==========================================
    adminTasks: () => {
        const filtered = getFilteredRequests(state.requests);
        return `
            <div class="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <h2 class="text-xl font-bold tracking-tight uppercase">Task Management</h2>
                <i class="fas fa-sync-alt cursor-pointer text-gray-400 hover:text-black" onclick="loadData()"></i>
            </div>
            ${searchFilterUI()}
            <div class="space-y-4">
                ${filtered.length === 0 ? '<p class="text-center text-xs text-gray-400 mt-10 uppercase tracking-widest">No tasks found</p>' : ''}
                ${filtered.map(req => {
                    const assignedText = (req.assignedTo && req.assignedTo !== 'undefined') ? req.assignedTo : '';
                    return `
                    <div class="card-minimal border-l-2 border-l-black relative">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold text-xs">${req.id}</span>
                            ${getStatusBadge(req.status)}
                        </div>
                        <p class="text-xs font-bold text-black uppercase">${req.category} - ${req.location}</p>
                        <p class="text-[10px] text-gray-500 mb-3">Req: ${req.requester} | Assigned: ${assignedText ? `<span class="bg-black text-white px-2 py-0.5 rounded-full font-bold ml-1">${assignedText}</span>` : '<span class="italic text-gray-400">Unassigned</span>'}</p>
                        
                        <div class="flex space-x-2 mt-3 pt-3 border-t border-gray-100 items-center justify-center">
                            <input type="text" id="assign-${req.id}" placeholder="Assign to..." value="${assignedText}" class="input-minimal text-[10px] px-3 w-2/5 h-8 !rounded-xl">
                            <button onclick="assignTask('${req.id}')" class="btn-minimal text-[10px] !p-0 h-8 w-1/5 flex items-center justify-center tracking-normal !rounded-xl">Assign</button>
                            ${(req.status !== 'completed' && req.status !== 'cancelled') ? `<button onclick="cancelRequest('${req.id}')" class="btn-minimal border-orange-400 text-orange-400 text-[10px] !p-0 h-8 w-1/5 hover:bg-orange-400 hover:text-white flex items-center justify-center tracking-normal !rounded-xl">${window.currentLang === "th" ? "ยกเลิก" : "Cancel"}</button>` : ''}
                            <button onclick="deleteTask('${req.id}')" class="btn-minimal border-red-500 text-red-500 text-[10px] !p-0 h-8 flex-1 hover:bg-red-500 hover:text-white flex items-center justify-center !rounded-xl"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    submit: () => `
        <h2 class="text-xl font-bold mb-6 tracking-tight uppercase border-b border-gray-100 pb-3">Submit Request</h2>
        <form onsubmit="handleSubmit(event)" class="space-y-5">
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Category</label>
                <select id="cat" class="input-minimal" required>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="General">General</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Location</label>
                <input type="text" id="loc" class="input-minimal" placeholder="e.g. Room 301" required>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Description</label>
                <textarea id="desc" class="textarea-minimal" placeholder="Explain the problem..." required></textarea>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Photo</label>
                <input type="file" id="fileInput" accept="image/*" class="hidden" onchange="handleImageUpload(event)">
                <div id="imagePreviewContainer" onclick="document.getElementById('fileInput').click()" class=\"border-2 border-gray-300 border-dashed rounded-3xl p-6 text-center text-gray-500 cursor-pointer hover:bg-gray-100 transition relative\">
                    <div id="imagePreviewText">
                        <i class="fas fa-camera text-xl mb-2"></i><br><span class="text-xs font-bold uppercase">Attach Image</span>
                    </div>
                    <img id="imagePreview" class="hidden mx-auto h-32 object-contain" />
                </div>
            </div>
            <button type="submit" class="btn-minimal mt-4">Submit Request</button>
        </form>
    `,

    // ==========================================
    // FEATURE 8: EDIT / CANCEL (for pending tasks)
    // ==========================================
    track: () => {
        const myRequests = state.requests.filter(r => r.requester === state.currentUser.username);
        return `
            <div class="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
                <h2 class="text-xl font-bold tracking-tight uppercase">My Track Status</h2>
                <i class="fas fa-sync-alt cursor-pointer text-gray-400 hover:text-black" onclick="loadData()"></i>
            </div>
            <div class="space-y-4">
                ${myRequests.length === 0 ? '<p class="text-xs text-gray-500 uppercase tracking-widest text-center mt-10">No requests found</p>' : ''}
                ${myRequests.map(req => `
                    <div class="card-minimal">
                        <div class="flex justify-between items-center mb-3">
                            <span class="font-bold text-sm tracking-wider">${req.id}</span>
                            ${getStatusBadge(req.status)}
                        </div>
                        ${req.image ? `<div class="mb-3 border border-gray-200"><img src="${req.image}" class="w-full h-32 object-cover"></div>` : ''}
                        <p class="text-sm font-bold uppercase text-gray-600 mb-1">${req.category}</p>
                        <p class="text-xs font-semibold mb-2">${req.location}</p>
                        ${req.assignedTo ? `<p class="text-[10px] text-gray-500 uppercase tracking-wide mb-2">${window.currentLang === 'th' ? 'ช่างผู้รับผิดชอบ:' : 'Mech:'} <span class="font-bold text-black">${req.assignedTo}</span></p>` : ''}
                        <p class="text-xs text-gray-500 border-t border-gray-200 pt-2 pb-2">${req.desc}</p>
                        
                        ${renderStepper(req.status)}
                        ${req.status !== 'pending' ? `
                        <div class="mt-4 pt-3 border-t border-gray-100">
                            <button onclick="openChat('${req.id}')" class="w-full bg-white border-2 border-gray-200 text-gray-500 text-xs font-bold uppercase py-2.5 rounded-xl hover:border-black hover:text-black transition flex items-center justify-center space-x-2">
                                <i class="fas fa-comment-dots"></i> <span>Chat</span>
                            </button>
                        </div>` : `
                        <div class="mt-4 pt-3 border-t border-gray-100 text-center">
                            <p class="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Chat will be available once a mechanic accepts.</p>
                        </div>`}
                        
                        ${req.status === 'pending' ? `
                            <div class="flex space-x-2 mt-4 pt-3 border-t border-gray-100 items-center justify-center">
                                <button onclick="openEdit('${req.id}')" class="btn-minimal text-[10px] !p-0 h-8 w-1/2 flex items-center justify-center tracking-normal !rounded-xl">Edit</button>
                                <button onclick="cancelRequest('${req.id}')" class="btn-minimal border-red-500 text-red-500 text-[10px] !p-0 h-8 w-1/2 hover:bg-red-500 hover:text-white flex items-center justify-center tracking-normal !rounded-xl">${window.currentLang === "th" ? "ยกเลิก" : "Cancel"}</button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    editRequest: () => {
        const req = state.requests.find(r => r.id === state.currentEditId);
        if(!req) return '<p>Not found</p>';
        return `
            <h2 class="text-xl font-bold mb-6 tracking-tight uppercase border-b border-gray-100 pb-3">Edit Request</h2>
            <form onsubmit="submitEdit(event, '${req.id}')" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Category</label>
                    <select id="edit-cat" class="input-minimal" required>
                        <option value="Electrical" ${req.category==='Electrical'?'selected':''}>Electrical</option>
                        <option value="Plumbing" ${req.category==='Plumbing'?'selected':''}>Plumbing</option>
                        <option value="Carpentry" ${req.category==='Carpentry'?'selected':''}>Carpentry</option>
                        <option value="General" ${req.category==='General'?'selected':''}>General</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Location</label>
                    <input type="text" id="edit-loc" class="input-minimal" value="${req.location}" required>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Description</label>
                    <textarea id="edit-desc" class="textarea-minimal" required>${req.desc}</textarea>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Photo</label>
                    <input type="file" id="fileInput" accept="image/*" class="hidden" onchange="handleImageUpload(event)">
                    <div id="imagePreviewContainer" onclick="document.getElementById('fileInput').click()" class="border-2 border-gray-300 border-dashed rounded-3xl p-6 text-center text-gray-500 cursor-pointer hover:bg-gray-100 transition relative">
                        <div id="imagePreviewText" class="${req.image ? 'hidden' : ''}">
                            <i class="fas fa-camera text-xl mb-2"></i><br><span class="text-xs font-bold uppercase">Change Image</span>
                        </div>
                        <img id="imagePreview" src="${req.image || ''}" class="${req.image ? '' : 'hidden'} mx-auto h-32 object-contain" />
                    </div>
                </div>
                <div class="flex space-x-2 mt-4">
                    <button type="submit" class="btn-minimal w-2/3">Save Changes</button>
                    <button type="button" onclick="switchView('track')" class="btn-minimal bg-gray-200 border-gray-200 text-black w-1/3 hover:bg-gray-300">Back</button>
                </div>
            </form>
        `;
    },
    chat: () => {
        const req = state.requests.find(r => r.id === state.currentChatId);
        if(!req) return '<p>Not found</p>';
        return `
            <div class="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <div class="flex items-center space-x-3">
                    <button onclick="closeChat()" class="text-gray-400 hover:text-black"><i class="fas fa-arrow-left"></i></button>
                    <div>
                        <h2 class="text-xl font-bold tracking-tight uppercase leading-none">Chat</h2>
                        <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">${req.id}</span>
                    </div>
                </div>
                <i class="fas fa-sync-alt cursor-pointer text-gray-400 hover:text-black" onclick="loadMessages()"></i>
            </div>
            
            <div id="chat-messages" class="flex flex-col space-y-3 overflow-y-auto mb-4 p-2 bg-gray-50 rounded-2xl" style="height: 50vh;">
                <!-- Messages go here -->
                <div class="flex flex-col items-center justify-center h-full text-gray-400">
                    <i class="fas fa-circle-notch fa-spin text-2xl mb-2"></i>
                </div>
            </div>

            <form onsubmit="sendChatMessage(event)" class="flex space-x-2 items-center">
                <label class="cursor-pointer text-gray-400 hover:text-black p-2 flex items-center justify-center">
                    <i class="fas fa-image text-xl"></i>
                    <input type="file" accept="image/*" class="hidden" onchange="sendChatImage(event)">
                </label>
                <input type="text" id="chat-input" class="input-minimal flex-1 !rounded-2xl" placeholder="Type a message..." autocomplete="off">
                <button type="submit" class="bg-black text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-gray-800 transition shadow-lg">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </form>
        `;
    },


    // ==========================================
    // FEATURE 5: SEARCH/FILTER (in Tech View)
    // ==========================================
    tech: () => {
        // Techs only see non-cancelled and non-completed
        const pending = getFilteredRequests(state.requests.filter(r => r.status === 'pending' || (r.status !== 'completed' && r.status !== 'cancelled' && r.assignedTo === state.currentUser.username)));
        return `
            <div class="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <h2 class="text-xl font-bold tracking-tight uppercase">Technician Tasks</h2>
                <i class="fas fa-sync-alt cursor-pointer text-gray-400 hover:text-black" onclick="loadData()"></i>
            </div>
            ${searchFilterUI()}
            <div class="space-y-4">
                ${pending.length === 0 ? '<p class="text-center text-gray-400 mt-10 text-xs uppercase tracking-widest">No active tasks</p>' : ''}
                ${pending.map(req => `
                    <div class="card-minimal border-l-4 border-l-black relative">
                        <div class="flex justify-between items-center mb-3">
                            <div class="flex flex-col">
                                <span class="font-bold text-sm">${req.id}</span>
                                ${req.assignedTo === state.currentUser.username ? '<span class="bg-black text-white text-[8px] px-1.5 py-0.5 rounded-sm uppercase font-bold tracking-widest mt-1 w-max">Assigned to you</span>' : ''}
                            </div>
                            ${getStatusBadge(req.status)}
                        </div>
                        ${req.image ? `<div class="mb-3 border border-gray-200"><img src="${req.image}" class="w-full h-32 object-cover"></div>` : ''}
                        
                        <div class="mb-3">
                            <p class="text-xs font-bold uppercase mb-1">${req.location}</p>
                            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Req: <span class="font-bold text-black">${req.requester}</span></p>
                        </div>
                        <p class="text-xs text-gray-600 mb-4 bg-gray-100 p-3 rounded-2xl border-none">${req.desc}</p>
                        
                        ${req.status !== 'pending' ? `
                        <div class="mt-4 pt-3 border-t border-gray-100">
                            <button onclick="openChat('${req.id}')" class="w-full mb-3 bg-white border-2 border-gray-200 text-gray-500 text-xs font-bold uppercase py-2.5 rounded-xl hover:border-black hover:text-black transition flex items-center justify-center space-x-2">
                                <i class="fas fa-comment-dots"></i> <span>Chat</span>
                            </button>
                        </div>` : ''}
                        <div class="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                            <button onclick="updateStatus('${req.id}', 'pending')" class="py-2.5 text-[9px] font-bold uppercase tracking-widest rounded-xl border transition-all bg-white border-gray-200 text-gray-400 hover:bg-black hover:border-black hover:text-white">Pending</button>
                            <button onclick="updateStatus('${req.id}', 'progress')" class="py-2.5 text-[9px] font-bold uppercase tracking-widest rounded-xl border transition-all bg-white border-gray-200 text-gray-400 hover:bg-black hover:border-black hover:text-white">In Progress</button>
                            <button onclick="updateStatus('${req.id}', 'completed')" class="py-2.5 text-[9px] font-bold uppercase tracking-widest rounded-xl border transition-all bg-white border-gray-200 text-gray-400 hover:bg-black hover:border-black hover:text-white">Complete</button>
                            <button onclick="updateStatus('${req.id}', 'cancelled')" class="py-2.5 text-[9px] font-bold uppercase tracking-widest rounded-xl border transition-all bg-white border-red-100 text-red-400 hover:bg-red-500 hover:border-red-500 hover:text-white">${window.currentLang === "th" ? "ยกเลิก" : "Cancel"}</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ==========================================
    // FEATURE 10: EXPORT TO PDF
    // ==========================================
    feedback: () => {
        let myCompleted = [];
        if(state.currentUser.role === 'admin' || state.currentUser.role === 'mech') {
            myCompleted = getFilteredRequests(state.requests.filter(r => r.status === 'completed')); // Admin/Mech can see all completed
        } else {
            myCompleted = state.requests.filter(r => r.status === 'completed' && r.requester === state.currentUser.username);
        }

        return `
            <div class="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <h2 class="text-xl font-bold tracking-tight uppercase">${state.currentUser.role === 'user' ? 'My Feedback' : 'Completed Log'}</h2>
                <i class="fas fa-sync-alt cursor-pointer text-gray-400 hover:text-black" onclick="loadData()"></i>
            </div>
            ${(state.currentUser.role !== 'user') ? searchFilterUI() : ''}
            <div class="space-y-4">
                ${myCompleted.length === 0 ? '<p class="text-center text-gray-400 mt-10 text-xs uppercase tracking-widest">No completed tasks</p>' : ''}
                ${myCompleted.map(req => `
                    <div class="card-minimal border-gray-300">
                        <div class="flex justify-between items-center mb-3">
                            <span class="font-bold text-sm text-gray-400">${req.id}</span>
                            ${state.currentUser.role !== 'user' ? `<button onclick="exportPDF('${req.id}')" class="text-[10px] uppercase font-bold text-black border border-black rounded-full px-3 py-2 hover:bg-black hover:text-white transition"><i class="fas fa-file-pdf mr-1"></i> Export Report</button>` : ''}
                        </div>
                        <p class="text-xs font-bold uppercase text-gray-600 mb-1">${req.category} - ${req.location}</p>
                        <p class="text-[10px] text-gray-500 mb-2">Requester: ${req.requester} ${req.assignedTo ? `| Mech: ${req.assignedTo}` : ''}</p>
                        
                        ${req.feedback ? `
                            <div class="border-t border-gray-200 pt-3 mt-3">
                                <p class="text-xs font-bold uppercase mb-1 text-gray-400">Rating</p>
                                <div class="text-black text-lg mb-3 tracking-widest">
                                    ${'★'.repeat(req.feedback.rating)}${'☆'.repeat(5-req.feedback.rating)}
                                </div>
                                <p class="text-xs font-bold uppercase mb-1 text-gray-400">Comment</p>
                                <p class="text-xs text-gray-800 italic bg-gray-100 p-3 rounded-2xl border-none">"${req.feedback.comment}"</p>
                            </div>
                        ` : (state.currentUser.role === 'user' ? `
                            <div id="fb-form-${req.id}" class="border-t border-gray-200 pt-3 mt-3">
                                <p class="text-xs font-bold uppercase mb-2 text-center text-gray-500">Leave a review</p>
                                <div class="flex justify-center space-x-2 text-2xl text-gray-300 mb-3 cursor-pointer">
                                    <span onclick="setRating('${req.id}', 1)" class="star-${req.id}">★</span>
                                    <span onclick="setRating('${req.id}', 2)" class="star-${req.id}">★</span>
                                    <span onclick="setRating('${req.id}', 3)" class="star-${req.id}">★</span>
                                    <span onclick="setRating('${req.id}', 4)" class="star-${req.id}">★</span>
                                    <span onclick="setRating('${req.id}', 5)" class="star-${req.id}">★</span>
                                </div>
                                <input type="text" id="fb-text-${req.id}" placeholder="Write a comment..." class="input-minimal mb-3 text-xs">
                                <button onclick="submitFeedback('${req.id}')" class="btn-minimal !p-0 h-10 text-xs flex items-center justify-center tracking-normal !rounded-xl">Submit Feedback</button>
                            </div>
                        ` : '<p class="text-[10px] text-gray-400 mt-2 italic">Awaiting user review</p>')}
                    </div>
                `).join('')}
            </div>
        `;
    }
};

window.renderNav = function() {
    const nav = document.getElementById('bottom-nav');
    const profile = document.getElementById('user-profile');
    if (!state.currentUser || currentView === 'login' || currentView === 'register') {
        nav.innerHTML = ''; profile.innerText = ''; nav.style.display = 'none'; return;
    }
    nav.style.display = 'flex';
    profile.innerText = state.currentUser.username + ' (' + state.currentUser.role + ')';

    if (state.currentUser.role === 'admin') {
        nav.innerHTML = `
            <div class="nav-item ${currentView === 'dashboard' ? 'active' : ''}" onclick="switchView('dashboard')"><i class="fas fa-chart-bar"></i><span>Stats</span></div>
            <div class="nav-item ${currentView === 'adminTasks' ? 'active' : ''}" onclick="switchView('adminTasks')"><i class="fas fa-tasks"></i><span>Manage</span></div>
            <div class="nav-item ${currentView === 'feedback' ? 'active' : ''}" onclick="switchView('feedback')"><i class="fas fa-file-alt"></i><span>Reports</span></div>
            <div class="nav-item ${currentView === 'profile' ? 'active' : ''}" onclick="switchView('profile')"><i class="fas fa-user"></i><span>Profile</span></div>
        `;
    } else if (state.currentUser.role === 'mech') {
        nav.innerHTML = `
            <div class="nav-item ${currentView === 'tech' ? 'active' : ''}" onclick="switchView('tech')"><i class="fas fa-wrench"></i><span>Tasks</span></div>
            <div class="nav-item ${currentView === 'feedback' ? 'active' : ''}" onclick="switchView('feedback')"><i class="fas fa-star"></i><span>Reviews</span></div>
            <div class="nav-item ${currentView === 'profile' ? 'active' : ''}" onclick="switchView('profile')"><i class="fas fa-user"></i><span>Profile</span></div>
        `;
    } else {
        nav.innerHTML = `
            <div class="nav-item ${currentView === 'submit' ? 'active' : ''}" onclick="switchView('submit')"><i class="fas fa-plus"></i><span>Submit</span></div>
            <div class="nav-item ${(currentView === 'track'||currentView==='editRequest') ? 'active' : ''}" onclick="switchView('track')"><i class="fas fa-list"></i><span>Track</span></div>
            <div class="nav-item ${currentView === 'feedback' ? 'active' : ''}" onclick="switchView('feedback')"><i class="fas fa-star"></i><span>Rating</span></div>
            <div class="nav-item ${currentView === 'profile' ? 'active' : ''}" onclick="switchView('profile')"><i class="fas fa-user"></i><span>Profile</span></div>
        `;
    }
};

window.renderView = function() {
    const container = document.getElementById('app-content');
    if (state.isLoading && currentView !== 'submit' && currentView !== 'login' && currentView !== 'register' && currentView !== 'profile') {
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-black mt-20"><i class="fas fa-circle-notch fa-spin text-3xl mb-4"></i><span class="text-xs font-bold uppercase tracking-widest text-gray-500">Syncing...</span></div>`;
        return;
    }
    container.innerHTML = views[currentView]();
    renderNav();
    if (typeof applyTranslation === 'function') applyTranslation();
};

window.switchView = function(viewName) {
    currentView = viewName;
    state.searchQuery = ''; // reset search on view change
    state.filterCat = 'All';
    renderView();
};

window.handleSearch = function(val) { state.searchQuery = val; renderView(); };
window.handleFilter = function(val) { state.filterCat = val; renderView(); };

// Auth functions remain the same logic
window.handleLogin = async function(e) {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText; btn.innerText = 'Logging in...';
    try {
        const { data, error } = await supabaseClient.from('app_users').select('*').eq('username', user).eq('password', pass).maybeSingle();
        if (data) {
            state.currentUser = { username: user, role: data.role };
            localStorage.setItem('smartCmuUser', JSON.stringify(state.currentUser));
            if(data.role === 'admin') switchView('dashboard');
            else if(data.role === 'mech') switchView('tech');
            else switchView('submit');
            loadData();
        } else showAppAlert('Login Failed', error ? 'Supabase Error: ' + error.message : 'Invalid username or password.', 'error');
    } catch(err) { showAppAlert('Network Error', 'Could not connect to the server.', 'error'); }
    btn.innerText = originalText;
};

window.handleRegister = async function(e) {
    e.preventDefault();
    const user = document.getElementById('reg-username').value;
    const pass = document.getElementById('reg-password').value;
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText; btn.innerText = 'Creating...';
    try {
        const { error } = await supabaseClient.from('app_users').insert([{ username: user, password: pass, role: 'user' }]);
        if (!error) { showAppAlert('Success', 'Action completed successfully.', 'success'); switchView('login'); } 
        else { if(error && error.code === '23505') showAppAlert('Registration Failed', 'This username is already taken. Please try another one.', 'error'); else showAppAlert('Failed', error ? error.message : 'Action could not be completed.', 'error'); }
    } catch(err) { showAppAlert('Network Error', 'Could not connect to the server.', 'error'); }
    btn.innerText = originalText;
};

window.handleChangePassword = async function(e) {
    e.preventDefault();
    const oldPass = document.getElementById('old-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;

    if (newPass !== confirmPass) {
        showAppAlert('Error', 'New passwords do not match.', 'error');
        return;
    }

    const btn = e.target.querySelector('button');
    const originalText = btn.innerText; btn.innerText = 'Updating...';
    try {
        const { data: userCheck } = await supabaseClient.from('app_users').select('*').eq('username', state.currentUser ? state.currentUser.username : user).eq('password', oldPass).maybeSingle();
        if (!userCheck) { showAppAlert('Error', 'Incorrect Old Password.', 'error'); btn.innerText = originalText; return; }

        const { error } = await supabaseClient.from('app_users').update({ password: newPass }).eq('username', state.currentUser ? state.currentUser.username : user);
        if (!error) { 
            showAppAlert('Success', 'Password changed successfully.', 'success'); 
            document.getElementById('old-password').value = ''; 
            document.getElementById('new-password').value = ''; 
            document.getElementById('confirm-password').value = ''; 
        } 
        else showAppAlert('Error', 'Update failed.', 'error');
    } catch(err) { showAppAlert('Network Error', 'Could not connect to the server.', 'error'); }
    btn.innerText = originalText;
};
window.handleLogout = function() { state.currentUser = null; localStorage.removeItem('smartCmuUser'); switchView('login'); };

window.handleForgotPassword = async function(e) {
    e.preventDefault();
    const user = document.getElementById('forgot-username').value;
    const oldPass = document.getElementById('forgot-old-password').value;
    const newPass = document.getElementById('forgot-password').value;
    const confirmPass = document.getElementById('forgot-confirm-password').value;
    
    if (newPass !== confirmPass) {
        showAppAlert('Error', 'New passwords do not match.', 'error');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText; btn.innerText = 'Updating...';
    try {
        const { data: userCheck } = await supabaseClient.from('app_users').select('*').eq('username', state.currentUser ? state.currentUser.username : user).eq('password', oldPass).maybeSingle();
        if (!userCheck) { showAppAlert('Error', 'Incorrect Old Password.', 'error'); btn.innerText = originalText; return; }

        const { error } = await supabaseClient.from('app_users').update({ password: newPass }).eq('username', state.currentUser ? state.currentUser.username : user);
        if (!error) { 
            showAppAlert('Success', 'Password updated successfully. Please login.', 'success'); 
            switchView('login'); 
        } else {
            showAppAlert('Error', data.message || 'Action failed.', 'error');
        }
    } catch(err) { showAppAlert('Network Error', 'Could not connect to the server.', 'error'); }
    btn.innerText = originalText;
};

// Data operations
window.loadData = async function() {
    if (!state.currentUser) return;
    
    // โหลดข้อมูลเก่าจาก Cache มาแสดงผลทันที (ไม่ให้หน้าจอหมุนรอ)
    const cachedData = localStorage.getItem('smartCmuRequests');
    if (cachedData) {
        state.requests = JSON.parse(cachedData);
        renderView();
    } else {
        state.isLoading = true; 
        renderView();
    }

    try {
        const { data, error } = await supabaseClient.from('requests').select('*').order('timestamp', { ascending: false });
        if (data) {
            state.requests = data.map(r => ({
                id: r.id, category: r.category, location: r.location, desc: r.description,
                image: r.image_url || "", status: r.status,
                feedback: (r.rating && r.comment) ? { rating: r.rating, comment: r.comment } : null,
                timestamp: r.timestamp, requester: r.requester, assignedTo: r.assigned_to || ""
            }));
            localStorage.setItem('smartCmuRequests', JSON.stringify(state.requests));
        }
    } catch (e) {
        console.error("Supabase fetch error:", e);
    }
    
    state.isLoading = false; 
    renderView();
};

window.handleSubmit = async function(e) {
    e.preventDefault();
    const cat = document.getElementById('cat').value;
    const loc = document.getElementById('loc').value;
    const desc = document.getElementById('desc').value;
    const newId = 'REQ-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Add to UI optimistically
    state.requests.unshift({ id: newId, category: cat, location: loc, desc: desc, image: currentImageBase64, status: 'pending', feedback: null, requester: state.currentUser.username });
    const imgBase64Temp = currentImageBase64;
    currentImageBase64 = ''; switchView('track');
    
    try {
        let publicImageUrl = "";
        if (imgBase64Temp) {
            let arr = imgBase64Temp.split(','), mime = arr[0].match(/:(.*?);/)[1], bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
            while(n--){ u8arr[n] = bstr.charCodeAt(n); }
            const file = new File([u8arr], `REQ_${newId}.jpg`, {type:mime});
            const { data: uploadData, error: uploadErr } = await supabaseClient.storage.from('req-images').upload(`public/${file.name}`, file);
            if (uploadErr) { showAppAlert('Image Error', uploadErr.message, 'error'); return; }
            if (uploadData) publicImageUrl = supabaseClient.storage.from('req-images').getPublicUrl(`public/${file.name}`).data.publicUrl;
        }

        await supabaseClient.from('requests').insert([{ id: newId, category: cat, location: loc, description: desc, image_url: publicImageUrl, status: 'pending', requester: state.currentUser.username }]);
        loadData(); // refresh background cache
    } catch (error) { console.error(error); }
};

window.handleImageUpload = function(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas'); const MAX_WIDTH = 400; const scale = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH; canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            currentImageBase64 = canvas.toDataURL('image/jpeg', 0.6); 
            document.getElementById('imagePreviewText').classList.add('hidden');
            const previewImg = document.getElementById('imagePreview'); previewImg.src = currentImageBase64; previewImg.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

// Edit / Cancel Actions
window.openEdit = function(id) { state.currentEditId = id; currentView = 'editRequest'; currentImageBase64 = ''; renderView(); };
window.submitEdit = async function(e, id) {
    e.preventDefault();
    const cat = document.getElementById('edit-cat').value;
    const loc = document.getElementById('edit-loc').value;
    const desc = document.getElementById('edit-desc').value;
    const req = state.requests.find(r => r.id === id);
    
    let publicImageUrl = req ? req.image : "";
    const imgBase64Temp = currentImageBase64;
    
    if(req) { req.category = cat; req.location = loc; req.desc = desc; if(imgBase64Temp) req.image = imgBase64Temp; }
    switchView('track');
    currentImageBase64 = '';
    
    try {
        if (imgBase64Temp) {
            let arr = imgBase64Temp.split(','), mime = arr[0].match(/:(.*?);/)[1], bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
            while(n--){ u8arr[n] = bstr.charCodeAt(n); }
            const file = new File([u8arr], `REQ_${id}_edit.jpg`, {type:mime});
            const { data: uploadData, error: uploadErr } = await supabaseClient.storage.from('req-images').upload(`public/${file.name}`, file, { upsert: true });
            if (!uploadErr && uploadData) {
                publicImageUrl = supabaseClient.storage.from('req-images').getPublicUrl(`public/${file.name}`).data.publicUrl;
            }
        }
        await supabaseClient.from('requests').update({ category: cat, location: loc, description: desc, image_url: publicImageUrl }).eq('id', id);
        if (imgBase64Temp) loadData();
    } catch (error) {}
};
window.cancelRequest = async function(id) {
    if(!(await showAppConfirm('Cancel Request', 'Are you sure you want to cancel this request?'))) return;
    const req = state.requests.find(r => r.id === id); if(req) req.status = 'cancelled';
    renderView();
    try {
        await supabaseClient.from('requests').update({ status: 'cancelled' }).eq('id', id);
    } catch (error) {}
};

// Admin Actions
window.deleteTask = async function(id) {
    if(!(await showAppConfirm('Delete Task', 'Delete this task permanently?'))) return;
    state.requests = state.requests.filter(r => r.id !== id); renderView();
    try {
        await supabaseClient.from('requests').delete().eq('id', id);
    } catch (error) {}
};
window.assignTask = async function(id) {
    const assignee = document.getElementById(`assign-${id}`).value;
    const req = state.requests.find(r => r.id === id); if(req) req.assignedTo = assignee;
    showAppAlert("Task Assigned", `Assigned ${id} to ${assignee}`, "success");
    renderView();
    try {
        await supabaseClient.from('requests').update({ assigned_to: assignee }).eq('id', id);
    } catch (error) {}
};

// Feedback and Status Updates
window.updateStatus = async function(id, newStatus) {
    let confirmMsg = "Are you sure you want to update this status?";
    if (newStatus === 'pending') confirmMsg = "Are you sure you want to change status to Pending?";
    if (newStatus === 'progress') confirmMsg = "Are you sure you want to change status to In Progress?";
    if (newStatus === 'completed') confirmMsg = "Are you sure you want to mark this as Completed?";
    if (newStatus === 'cancelled') confirmMsg = "Are you sure you want to cancel this request?";
    
    if (!(await showAppConfirm("Update Status", confirmMsg))) return;

    const req = state.requests.find(r => r.id === id); 
    if(req) {
        req.status = newStatus; 
        if (state.currentUser.role === 'mech') {
            req.assignedTo = (newStatus === 'pending') ? null : state.currentUser.username;
        }
        renderView();
    }
    try {
        let updatePayload = { status: newStatus };
        if (state.currentUser.role === 'mech') updatePayload.assigned_to = (newStatus === 'pending') ? null : state.currentUser.username;
        await supabaseClient.from('requests').update(updatePayload).eq('id', id);
    } catch (error) {}
};
window.setRating = function(id, rating) {
    tempRatings[id] = rating;
    const stars = document.querySelectorAll(`.star-${id}`);
    stars.forEach((star, index) => {
        if(index < rating) { star.classList.remove('text-gray-300'); star.classList.add('text-black'); } 
        else { star.classList.remove('text-black'); star.classList.add('text-gray-300'); }
    });
};
window.submitFeedback = async function(id) {
    const rating = tempRatings[id] || 5;
    const comment = document.getElementById(`fb-text-${id}`).value || '-';
    const req = state.requests.find(r => r.id === id); if(req) req.feedback = { rating, comment };
    renderView();
    try {
        await supabaseClient.from('requests').update({ rating: rating, comment: comment }).eq('id', id);
    } catch (error) {}
};


// ==========================================
// CHAT LOGIC
// ==========================================
let chatInterval = null;

window.openChat = function(id) {
    state.currentChatId = id;
    state.previousView = currentView; // Remember where we came from
    currentView = 'chat';
    renderView();
    loadMessages();
    // Auto refresh chat every 3 seconds
    if(chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(loadMessages, 3000);
};

window.closeChat = function() {
    if(chatInterval) clearInterval(chatInterval);
    currentView = state.previousView || 'track';
    renderView();
};

window.loadMessages = async function() {
    if(currentView !== 'chat') return;
    try {
        const { data, error } = await supabaseClient.from('messages').select('*').eq('request_id', state.currentChatId).order('created_at', { ascending: true });
        if(error) {
            console.error(error);
            return;
        }
        
        const container = document.getElementById('chat-messages');
        if(!container) return;
        
        if(data.length === 0) {
            container.innerHTML = `<div class="flex items-center justify-center h-full text-[10px] text-gray-400 font-bold uppercase tracking-widest">${window.currentLang === 'th' ? 'ยังไม่มีข้อความ' : 'No messages yet.'}</div>`;
            return;
        }

        let html = '';
        data.forEach(msg => {
            const isMe = msg.sender === state.currentUser.username;
            html += `
                <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                    <span class="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 px-1">${msg.sender}</span>
                    <div class="px-4 py-2 rounded-2xl max-w-[80%] text-[13px] ${isMe ? 'bg-black text-white rounded-br-sm' : 'bg-white border border-gray-200 text-black rounded-bl-sm'}">
                        ${msg.message ? `<div>${msg.message}</div>` : ''}
                        ${msg.image_url ? `<img src="${msg.image_url}" class="rounded-xl ${msg.message ? 'mt-2' : ''} w-full max-w-[180px] object-cover cursor-pointer" onclick="window.open('${msg.image_url}', '_blank')">` : ''}
                    </div>
                </div>
            `;
        });
        
        if(container.innerHTML.trim() !== html.trim() && !container.innerHTML.includes('fa-circle-notch')) {
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
            container.innerHTML = html;
            if(isAtBottom) container.scrollTop = container.scrollHeight;
        } else if (container.innerHTML.includes('fa-circle-notch')) {
            container.innerHTML = html;
            container.scrollTop = container.scrollHeight;
        }
    } catch(err) {}
};

window.sendChatImage = async function(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    const container = document.getElementById('chat-messages');
    if(container) {
        if(container.innerHTML.includes('No messages') || container.innerHTML.includes('ยังไม่มีข้อความ')) container.innerHTML = '';
        container.innerHTML += `
            <div class="flex flex-col items-end opacity-50">
                <span class="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 px-1">${state.currentUser.username}</span>
                <div class="px-4 py-2 rounded-2xl max-w-[80%] text-[13px] bg-black text-white rounded-br-sm flex items-center space-x-2">
                    <i class="fas fa-spinner fa-spin"></i> <span>Sending Image...</span>
                </div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `chat/${state.currentChatId}/${fileName}`;
        
        const { error: uploadError } = await supabaseClient.storage.from('req-images').upload(filePath, file);
        if(uploadError) throw uploadError;
        
        const { data: urlData } = supabaseClient.storage.from('req-images').getPublicUrl(filePath);
        const imgUrl = urlData.publicUrl;
        
        const { error } = await supabaseClient.from('messages').insert([{
            request_id: state.currentChatId,
            sender: state.currentUser.username,
            message: '', 
            image_url: imgUrl
        }]);
        if (error) throw error;
        
        loadMessages();
    } catch(err) {
        showAppAlert('Chat Error', err.message || 'Could not send image.');
        loadMessages(); 
    }
};

window.sendChatMessage = async function(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if(!message) return;
    
    input.value = '';
    
    // Optimistic UI update
    const container = document.getElementById('chat-messages');
    if(container) {
        if(container.innerHTML.includes('No messages') || container.innerHTML.includes('ยังไม่มีข้อความ')) container.innerHTML = '';
        container.innerHTML += `
            <div class="flex flex-col items-end opacity-50">
                <span class="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 px-1">${state.currentUser.username}</span>
                <div class="px-4 py-2 rounded-2xl max-w-[80%] text-[13px] bg-black text-white rounded-br-sm">
                    ${message}
                </div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;
    }

    try {
        const { error } = await supabaseClient.from('messages').insert([{
            request_id: state.currentChatId,
            sender: state.currentUser.username,
            message: message
        }]);
        if (error) {
            console.error(error);
            showAppAlert('Chat Error', error.message || 'Could not send message.');
        } else {
            loadMessages(); // reload to get actual DB state
        }
    } catch(err) {
        showAppAlert('Chat Error', err.message);
    }
};

// Export to PDF (Feature 10)

window.exportPDF = function(id) {
    const req = state.requests.find(r => r.id === id);
    if(!req) return;
    
    const printWindow = window.open('', '', 'height=800,width=800');
    
    // Generate stars for feedback
    let starsHTML = '';
    if(req.feedback) {
        starsHTML = Array(5).fill(0).map((_, i) => `<span style="color: ${i < req.feedback.rating ? '#000' : '#ddd'}; font-size: 18px;">★</span>`).join('');
    }

    const content = `
        <html><head>
            <title>Report - ${req.id}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 40px 50px; line-height: 1.6; max-width: 800px; margin: 0 auto; background: #fff; }
                .top-brand { font-size: 12px; font-weight: 700; letter-spacing: 2px; color: #000; text-transform: uppercase; margin-bottom: 40px; }
                .header-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 1px solid #eaeaea; padding-bottom: 20px; }
                .header-title { font-size: 24px; font-weight: 300; margin: 0 0 5px 0; color: #000; letter-spacing: -0.5px; }
                .status-badge { display: inline-block; padding: 6px 14px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 1px; background: #f0f0f0; color: #000; text-transform: uppercase; border: 1px solid #e0e0e0; }
                .status-badge.completed { background: #000; color: #fff; border-color: #000; }
                
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
                .item { margin-bottom: 5px; }
                .item.full { grid-column: span 2; }
                .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; display: block; font-weight: 600;}
                .value { font-size: 14px; color: #111; font-weight: 400; }
                
                .img-container { margin-top: 30px; }
                .img-container img { max-width: 100%; max-height: 350px; border-radius: 6px; object-fit: cover; }
                
                .feedback-section { margin-top: 40px; background: #fafafa; border-radius: 6px; padding: 25px; border: 1px solid #eaeaea; }
                .feedback-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #000; margin-top: 0; margin-bottom: 15px; }
                .comment { font-size: 14px; color: #444; font-style: italic; line-height: 1.5; margin-top: 10px; }
                
                .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eaeaea; padding-top: 20px; letter-spacing: 1px; }
            </style>
        </head><body>
            <div class="top-brand">PROTOTYPE CMU MAINTENANCE</div>
            
            <div class="header-flex">
                <div>
                    <h1 class="header-title">Maintenance Report</h1>
                    <div class="label" style="color: #000;">ID: ${req.id}</div>
                </div>
                <div>
                    <span class="status-badge ${req.status === 'completed' ? 'completed' : ''}">${req.status}</span>
                </div>
            </div>
            
            <div class="grid">
                <div class="item"><span class="label">Date</span><span class="value">${new Date(req.timestamp).toLocaleString()}</span></div>
                <div class="item"><span class="label">Category</span><span class="value">${req.category}</span></div>
                
                <div class="item"><span class="label">Requester</span><span class="value">${req.requester}</span></div>
                <div class="item"><span class="label">Assigned Mechanic</span><span class="value">${req.assignedTo || '-'}</span></div>
                
                <div class="item full"><span class="label">Location</span><span class="value">${req.location}</span></div>
                <div class="item full"><span class="label">Description</span><span class="value">${req.desc}</span></div>
            </div>
            
            ${req.image ? `<div class="img-container"><span class="label">Attached Photo</span><img src="${req.image}" /></div>` : ''}
            
            ${req.feedback ? `
                <div class="feedback-section">
                    <h3 class="feedback-title">User Feedback</h3>
                    <div>${starsHTML}</div>
                    <div class="comment">"${req.feedback.comment}"</div>
                </div>
            ` : ''}
            
            <div class="footer">GENERATED BY PROTOTYPE CMU MAINTENANCE SYSTEM</div>
        </body></html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 800); // delay to load image
};

document.addEventListener('DOMContentLoaded', () => { renderView(); if (state.currentUser) loadData(); });


// ==========================================
// TRANSLATION SYSTEM
// ==========================================
window.thDict = {
    "MY PROFILE": "โปรไฟล์ส่วนตัว",
    "LOGGED IN AS": "เข้าสู่ระบบในชื่อ",
    "ROLE: USER": "สิทธิ์: ผู้ใช้งาน",
    "ROLE: ADMIN": "สิทธิ์: ผู้ดูแลระบบ",
    "ROLE: MECH": "สิทธิ์: ช่างซ่อม",
    "CHANGE PASSWORD": "เปลี่ยนรหัสผ่าน",
    "Old password": "รหัสผ่านเดิม",
    "New password": "รหัสผ่านใหม่",
    "Confirm new password": "ยืนยันรหัสผ่านใหม่",
    "UPDATE": "อัปเดต",
    "LOG OUT": "ออกจากระบบ",
    "Admin Dashboard": "สถิติผู้ดูแลระบบ",
    "Total Tasks": "งานทั้งหมด",
    "Avg Rating": "คะแนนเฉลี่ย",
    "Task Management": "จัดการงานซ่อม",
    "No tasks found": "ไม่พบรายการ",
    "Search ID, Location...": "ค้นหารหัส, สถานที่...",
    "All": "ทั้งหมด",
    "Assign": "มอบหมาย",
    "Unassigned": "ยังไม่มอบหมาย",
    "Submit Request": "แจ้งซ่อม",
    "Category": "หมวดหมู่",
    "Location": "สถานที่",
    "Description": "รายละเอียด",
    "Photo": "รูปภาพ",
    "Attach Image": "แนบรูปภาพ",
    "Change Image": "เปลี่ยนรูปภาพ",
    "My Track Status": "ติดตามสถานะ",
    "No requests found": "ไม่พบรายการแจ้งซ่อม",
    "Waiting for mechanic...": "รอการดำเนินการ...",
    "Pending": "รอดำเนินการ",
    "In Progress": "กำลังดำเนินการ",
    "Progress": "กำลังดำเนินการ",
    "Completed": "เสร็จสิ้น",
    "Cancelled": "ยกเลิกแล้ว",
    "WAITING...": "รอรับงาน...",
    "Edit": "แก้ไข",
    "Cancel": "ยกเลิก",
    "Edit Request": "แก้ไขรายการแจ้งซ่อม",
    "Save Changes": "บันทึกการแก้ไข",
    "Back": "กลับ",
    "Technician Tasks": "รายการงานช่าง",
    "No active tasks": "ไม่มีงานในขณะนี้",
    "Assigned to you": "งานของคุณ",
    "My Feedback": "ประวัติคำร้อง",
    "Completed Log": "ประวัติงานซ่อม",
    "No completed tasks": "ไม่มีประวัติงาน",
    "Export Report": "ออกรายงาน",
    "Leave a review": "ให้คะแนนและรีวิว",
    "Submit Feedback": "ส่งคำรีวิว",
    "Rating": "คะแนน",
    "Comment": "ความคิดเห็น",
    "Electrical": "ระบบไฟฟ้า",
    "Plumbing": "ระบบประปา",
    "Carpentry": "งานไม้",
    "General": "ทั่วไป",
    "SUBMIT": "แจ้งซ่อม",
    "TRACK": "ติดตาม",
    "RATING": "ประเมิน",
    "PROFILE": "โปรไฟล์",
    "DASHBOARD": "สถิติ",
    "ADMIN": "จัดการ",
    "REVIEWS": "รีวิว",
    "TASKS": "งานซ่อม",
    "Wait": "รอดำเนินการ",
    "Working": "กำลังซ่อม",
    "Done": "เสร็จสิ้น",
    "Complete": "เสร็จสิ้น",
    "PROTOTYPE CMU MAINTENANCE": "ระบบแจ้งซ่อม CMU",
    "Syncing...": "กำลังซิงค์...",
    "Login": "เข้าสู่ระบบ",
    "Register": "สมัครสมาชิก",
    "Username": "ชื่อผู้ใช้",
    "Password": "รหัสผ่าน",
    "Don't have an account?": "ยังไม่มีบัญชีใช่ไหม?",
    "Already have an account?": "มีบัญชีอยู่แล้ว?",
    "Forgot password?": "ลืมรหัสผ่าน?",
    "Forgot Password?": "ลืมรหัสผ่าน?",
    "Register Here": "สมัครสมาชิก",
    "Log In": "เข้าสู่ระบบ",
    "Cancel Request": "ยกเลิกคำร้อง",
    "Are you sure you want to cancel this request?": "คุณแน่ใจหรือไม่ที่จะยกเลิกคำร้องนี้?",
    "Are you sure you want to log out?": "คุณต้องการออกจากระบบใช่หรือไม่?",
    "Error": "เกิดข้อผิดพลาด",
    "ช่างผู้รับผิดชอบ:": "ช่างผู้รับผิดชอบ:",
    "Chat Error": "ข้อผิดพลาดการแชท",
    "Recent Chats": "ประวัติการสนทนา",
    "ยังไม่มีประวัติแชท": "ยังไม่มีประวัติแชท",
    "No chat history yet": "ยังไม่มีประวัติแชท",


    "Chat": "แชท",
    "Chat will be available once a mechanic accepts.": "แชทจะเปิดให้ใช้งานเมื่อช่างรับงานแล้ว",

    "Type a message...": "พิมพ์ข้อความ...",
    "No messages yet.": "ยังไม่มีข้อความ",

    "Update Status": "อัปเดตสถานะ",
    "Are you sure you want to change status to Pending?": "คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะเป็นรอดำเนินการ?",
    "Are you sure you want to change status to In Progress?": "คุณแน่ใจหรือไม่ที่จะรับงานนี้ (กำลังดำเนินการ)?",
    "Are you sure you want to mark this as Completed?": "คุณแน่ใจหรือไม่ที่จะปิดงานนี้ (เสร็จสิ้น)?",

    "Failed": "ล้มเหลว",

    "Registration Failed": "สมัครสมาชิกไม่สำเร็จ",
    "This username is already taken. Please try another one.": "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาลองชื่ออื่น",
    "Success": "สำเร็จ",
    "Action completed successfully.": "ดำเนินการเสร็จสิ้น",

    "Update Password": "อัปเดตรหัสผ่าน",
    "← Back to Login": "← กลับไปหน้าเข้าสู่ระบบ",
    "Create Account": "สร้างบัญชี",
    "Reset Password": "ตั้งรหัสผ่านใหม่"
};

window.currentLang = localStorage.getItem('appLang') || 'en';

window.toggleLang = function() {
    window.currentLang = window.window.currentLang === 'en' ? 'th' : 'en';
    localStorage.setItem('appLang', window.currentLang);
    renderView();
};

window.applyTranslation = function() {
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.innerText = window.currentLang === 'en' ? 'TH' : 'EN';
    
    const titleEl = document.getElementById('app-title-text');
    if (titleEl) {
        titleEl.innerText = window.currentLang === 'en' ? "PROTOTYPE CMU MAINTENANCE" : "ระบบแจ้งซ่อม CMU";
    }

    if (window.currentLang === 'en') return;

    // A small helper to translate a single text node
    const translateNode = (node) => {
        if (!node.nodeValue) return;
        let originalText = node.nodeValue.trim();
        if (originalText === '') return;
        
        // Exact match
        if (window.thDict[originalText]) {
            node.nodeValue = node.nodeValue.replace(originalText, window.thDict[originalText]);
            return;
        }
        
        // Case insensitive match
        const lowerVal = originalText.toLowerCase();
        const key = Object.keys(thDict).find(k => k.toLowerCase() === lowerVal);
        if (key) {
            node.nodeValue = node.nodeValue.replace(originalText, window.thDict[key]);
            return;
        }
        
        // Split and translate parts (useful for "Req: Thomas" -> "ผู้แจ้ง: Thomas")
        let replaced = node.nodeValue;
        for (const [enKey, thVal] of Object.entries(thDict)) {
            if (replaced.includes(enKey)) {
                replaced = replaced.replace(enKey, thVal);
            }
        }
        node.nodeValue = replaced;
    };

    // Walk all text nodes in app-content and bottom-nav
    const walkNodes = (rootId) => {
        const root = document.getElementById(rootId);
        if (!root) return;
        const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        let n;
        while(n = walk.nextNode()) {
            translateNode(n);
        }
    };
    
    walkNodes('app-content');
    walkNodes('bottom-nav');

    // Translate inputs/textareas placeholders
    const root = document.getElementById('app-content');
    if (root) {
        const inputs = root.querySelectorAll('input[placeholder], textarea[placeholder]');
        inputs.forEach(input => {
            let p = input.placeholder;
            if (window.thDict[p]) input.placeholder = window.thDict[p];
        });
        
        // Dropdowns options
        const options = root.querySelectorAll('option');
        options.forEach(opt => {
            const txt = opt.innerText.trim();
            if (window.thDict[txt]) opt.innerText = window.thDict[txt];
        });
    }
};


// ==========================================
// FEATURE: ZOOM CONTROL
// ==========================================
window.setZoom = function(scale) {
    const device = document.querySelector('.device');
    if (device) {
        device.style.transform = `scale(${scale})`;
        device.style.transformOrigin = 'center center';
    }
};
