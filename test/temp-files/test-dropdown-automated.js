// Automated test script for dropdown positioning
// This script will be run by Playwright to verify the fix

const testScript = `
// Wait for page to load
await new Promise(resolve => setTimeout(resolve, 2000));

// Navigate to the EU Marketing Calendar page
const navButton = document.querySelector('[data-module="amz_marketing_calendar"]');
if (navButton) {
    navButton.click();
    await new Promise(resolve => setTimeout(resolve, 1500));
}

// Click the search box to show dropdown
const searchBox = document.getElementById('amzf_search_box');
if (searchBox) {
    searchBox.click();
    await new Promise(resolve => setTimeout(resolve, 500));
}

// Run verification
const dropdown = document.getElementById('amzf_search_history');
const searchBoxEl = document.querySelector('.amzf_search_box');

if (dropdown && searchBoxEl) {
    const searchRect = searchBoxEl.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();
    
    console.log('=== Dropdown Position Test ===');
    console.log('Search box bottom:', searchRect.bottom);
    console.log('Dropdown set top:', dropdown.style.top);
    console.log('Dropdown actual top:', dropdownRect.top);
    console.log('Dropdown transform:', dropdown.style.transform);
    console.log('Computed transform:', window.getComputedStyle(dropdown).transform);
    
    const topDiff = Math.abs(dropdownRect.top - parseFloat(dropdown.style.top));
    const leftDiff = Math.abs(dropdownRect.left - parseFloat(dropdown.style.left));
    
    console.log('\\nPosition differences:');
    console.log('  top diff:', topDiff, topDiff < 2 ? '✅' : '❌');
    console.log('  left diff:', leftDiff, leftDiff < 2 ? '✅' : '❌');
    
    if (topDiff < 2 && leftDiff < 2) {
        console.log('\\n🎉🎉🎉 SUCCESS! Position is correct!');
        return { success: true, topDiff, leftDiff };
    } else {
        console.log('\\n⚠️ FAILED: Still has offset');
        
        // Run debug transform check
        console.log('\\n=== Parent Transform Check ===');
        let parent = dropdown.parentElement;
        let level = 0;
        while (parent && level < 5) {
            const parentStyle = window.getComputedStyle(parent);
            console.log(\`Level \${level} - \${parent.tagName}.\${parent.className}:\`);
            console.log(\`  transform: \${parentStyle.transform}\`);
            console.log(\`  position: \${parentStyle.position}\`);
            parent = parent.parentElement;
            level++;
        }
        
        return { success: false, topDiff, leftDiff };
    }
} else {
    console.log('❌ ERROR: Could not find dropdown or search box');
    return { success: false, error: 'Elements not found' };
}
`;

console.log('Test script ready. This should be run in Playwright context.');
console.log('For now, manual testing is required in the browser.');
