const fs = require('fs');
const { JSDOM } = require('jsdom');

// 1. Update dashboard.html
const html = fs.readFileSync('dashboard.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

// A. Upload Claims Data
const claimsHeader = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Upload Claims Data'));
if (claimsHeader) {
    const headerDiv = claimsHeader.closest('.settings-header');
    if (headerDiv) {
        headerDiv.style.cursor = 'pointer';
        if (!headerDiv.querySelector('.chevron')) {
            const chevron = document.createElement('i');
            chevron.setAttribute('data-lucide', 'chevron-down');
            chevron.className = 'chevron';
            headerDiv.appendChild(chevron);
        }
        
        const contentDiv = headerDiv.nextElementSibling;
        if (contentDiv && contentDiv.classList.contains('settings-content')) {
            contentDiv.style.display = 'none';
        }
    }
}

// B. Dashboard User Management
const userHeader = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Dashboard User Management'));
if (userHeader) {
    const containerDiv = userHeader.closest('div[style*="justify-content: space-between"]');
    if (containerDiv) {
        containerDiv.classList.add('settings-header');
        containerDiv.style.cursor = 'pointer';
        
        // Wrap the h3 and chevron in a flex div
        const titleWrapper = document.createElement('div');
        titleWrapper.style.display = 'flex';
        titleWrapper.style.alignItems = 'center';
        titleWrapper.style.gap = '8px';
        
        userHeader.parentNode.insertBefore(titleWrapper, userHeader);
        titleWrapper.appendChild(userHeader);
        
        const chevron = document.createElement('i');
        chevron.setAttribute('data-lucide', 'chevron-down');
        chevron.className = 'chevron';
        titleWrapper.appendChild(chevron);
        
        // Now wrap the rest of the card in .settings-content
        const cardDiv = containerDiv.parentElement;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'settings-content';
        contentDiv.style.display = 'none';
        
        // Move all siblings after containerDiv into contentDiv
        while (containerDiv.nextSibling) {
            contentDiv.appendChild(containerDiv.nextSibling);
        }
        
        cardDiv.appendChild(contentDiv);
    }
}

fs.writeFileSync('dashboard.html', dom.serialize(), 'utf8');
console.log("Updated dashboard.html");

// 2. Update main.js
let mainJs = fs.readFileSync('main.js', 'utf8');
mainJs = mainJs.replace(
    "document.getElementById('add-user-btn').addEventListener('click', () => {",
    "document.getElementById('add-user-btn').addEventListener('click', (e) => {\n      e.stopPropagation();"
);
fs.writeFileSync('main.js', mainJs, 'utf8');
console.log("Updated main.js");
