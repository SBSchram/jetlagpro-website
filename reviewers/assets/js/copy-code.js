/**
 * Shared copy-to-clipboard function for code blocks
 * Works with both .code-block (light) and .code-block-dark (dark) themes
 */
function copyCode(button) {
    // Find the code block container (works for both .code-block and .code-block-dark)
    const codeBlock = button.closest('.code-block, .code-block-dark');
    if (!codeBlock) {
        console.error('Code block container not found');
        return;
    }
    
    const codeElement = codeBlock.querySelector('code');
    if (!codeElement) {
        console.error('Code element not found');
        return;
    }
    
    const text = codeElement.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback
        button.classList.add('copied');
        const originalTitle = button.getAttribute('title') || 'Copy to clipboard';
        button.setAttribute('title', 'Copied!');
        
        setTimeout(() => {
            button.classList.remove('copied');
            button.setAttribute('title', originalTitle);
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback: select text
        try {
            const range = document.createRange();
            range.selectNode(codeElement);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        } catch (fallbackErr) {
            console.error('Fallback selection failed:', fallbackErr);
        }
    });
}

