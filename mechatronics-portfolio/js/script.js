// Copy email (the button is only on the contact page)
const copyEmail = document.querySelector('.copy-email');
const copyStatus = document.querySelector('.copy-status');
let copyTimer;

copyEmail?.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(copyEmail.dataset.email);
        copyEmail.textContent = 'Copied';
        copyStatus.textContent = '';
    } catch {
        copyStatus.textContent = 'Copying is blocked in this browser. Select the address to copy it.';
    }

    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
        copyEmail.textContent = 'Copy address';
    }, 2200);
});
