// Funkce pro nastavení cookie
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

// Funkce pro získání cookie
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Funkce pro smazání cookie
function eraseCookie(name) {   
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

// Funkce pro zobrazení cookie lišty
function showCookieConsent() {
    if (!getCookie('cookieConsent')) {
        const cookieConsent = document.createElement('div');
        cookieConsent.id = 'cookieConsent';
        cookieConsent.innerHTML = `
            <div class="fixed bottom-0 left-0 right-0 bg-gray-900 text-white py-4 px-4 md:px-6 z-50">
                <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="text-sm">
                        Používáme cookies pro zlepšení našich služeb. Některé jsou nezbytné pro správné fungování webu, 
                        jiné nám pomáhají web vylepšovat a přizpůsobovat vašim potřebám.
                        <a href="/cookies.html" class="text-primary hover:text-primary/80 ml-1">Více informací</a>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="acceptAllCookies()" class="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full text-sm font-semibold transition-colors">
                            Přijmout vše
                        </button>
                        <button onclick="showCookieSettings()" class="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition-colors">
                            Nastavení
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(cookieConsent);
    }
}

// Funkce pro zobrazení nastavení cookies
function showCookieSettings() {
    const cookieSettings = document.createElement('div');
    cookieSettings.id = 'cookieSettings';
    cookieSettings.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-900">Nastavení cookies</h2>
                        <button onclick="closeCookieSettings()" class="text-gray-400 hover:text-gray-500">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="space-y-6">
                        <div class="flex items-center justify-between py-4 border-b">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">Technické cookies</h3>
                                <p class="text-sm text-gray-500">Nezbytné pro správné fungování webu</p>
                            </div>
                            <div class="flex items-center">
                                <input type="checkbox" id="technicalCookies" checked disabled
                                    class="w-4 h-4 text-primary bg-gray-100 rounded border-gray-300 cursor-not-allowed">
                            </div>
                        </div>
                        <div class="flex items-center justify-between py-4 border-b">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">Analytické cookies</h3>
                                <p class="text-sm text-gray-500">Pomáhají nám pochopit, jak používáte náš web</p>
                            </div>
                            <div class="flex items-center">
                                <input type="checkbox" id="analyticalCookies"
                                    class="w-4 h-4 text-primary bg-gray-100 rounded border-gray-300 cursor-pointer">
                            </div>
                        </div>
                        <div class="flex items-center justify-between py-4 border-b">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">Marketingové cookies</h3>
                                <p class="text-sm text-gray-500">Používáme je pro cílenou reklamu</p>
                            </div>
                            <div class="flex items-center">
                                <input type="checkbox" id="marketingCookies"
                                    class="w-4 h-4 text-primary bg-gray-100 rounded border-gray-300 cursor-pointer">
                            </div>
                        </div>
                    </div>
                    <div class="mt-8 flex justify-end gap-4">
                        <button onclick="saveCookieSettings()" 
                            class="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full text-sm font-semibold transition-colors">
                            Uložit nastavení
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(cookieSettings);

    // Načtení uložených preferencí
    document.getElementById('analyticalCookies').checked = getCookie('analyticalCookies') === 'true';
    document.getElementById('marketingCookies').checked = getCookie('marketingCookies') === 'true';
}

// Funkce pro zavření nastavení cookies
function closeCookieSettings() {
    const settings = document.getElementById('cookieSettings');
    if (settings) {
        settings.remove();
    }
}

// Funkce pro přijetí všech cookies
function acceptAllCookies() {
    setCookie('cookieConsent', 'true', 365);
    setCookie('technicalCookies', 'true', 365);
    setCookie('analyticalCookies', 'true', 365);
    setCookie('marketingCookies', 'true', 365);
    
    const consent = document.getElementById('cookieConsent');
    if (consent) {
        consent.remove();
    }
}

// Funkce pro uložení nastavení cookies
function saveCookieSettings() {
    setCookie('cookieConsent', 'true', 365);
    setCookie('technicalCookies', 'true', 365);
    setCookie('analyticalCookies', document.getElementById('analyticalCookies').checked, 365);
    setCookie('marketingCookies', document.getElementById('marketingCookies').checked, 365);
    
    closeCookieSettings();
    
    const consent = document.getElementById('cookieConsent');
    if (consent) {
        consent.remove();
    }
}

// Inicializace při načtení stránky
document.addEventListener('DOMContentLoaded', showCookieConsent);
