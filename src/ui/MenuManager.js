export class MenuManager {
    constructor() {
        this.currentMenu = 'main';
        this.menuStack = [];
        this.transitions = true;
        
        this.menus = {
            main: document.getElementById('main-menu'),
            settings: document.getElementById('settings-modal'),
            leaderboard: document.getElementById('leaderboard-modal'),
            game: document.getElementById('game-container')
        };
        
        this.setupAnimations();
    }
    
    setupAnimations() {
        // Add hover effects to menu buttons
        document.querySelectorAll('.menu-button').forEach(button => {
            button.addEventListener('mouseenter', () => {
                this.animateButton(button, 'hover');
            });
            
            button.addEventListener('mouseleave', () => {
                this.animateButton(button, 'leave');
            });
            
            button.addEventListener('click', () => {
                this.animateButton(button, 'click');
            });
        });
        
        // Parallax effect on main menu
        const menuContainer = document.querySelector('.menu-container');
        if (menuContainer) {
            document.addEventListener('mousemove', (e) => {
                if (this.currentMenu === 'main') {
                    const x = (e.clientX / window.innerWidth - 0.5) * 20;
                    const y = (e.clientY / window.innerHeight - 0.5) * 20;
                    menuContainer.style.transform = `translate(${x}px, ${y}px)`;
                }
            });
        }
    }
    
    animateButton(button, type) {
        switch (type) {
            case 'hover':
                button.style.transform = 'translateY(-5px) scale(1.05)';
                this.createButtonParticles(button);
                break;
            case 'leave':
                button.style.transform = 'translateY(0) scale(1)';
                break;
            case 'click':
                button.style.transform = 'translateY(0) scale(0.95)';
                setTimeout(() => {
                    button.style.transform = 'translateY(0) scale(1)';
                }, 100);
                break;
        }
    }
    
    createButtonParticles(button) {
        const rect = button.getBoundingClientRect();
        const particleCount = 5;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'menu-particle';
            particle.style.left = rect.left + Math.random() * rect.width + 'px';
            particle.style.top = rect.top + rect.height + 'px';
            particle.style.setProperty('--dx', (Math.random() - 0.5) * 100 + 'px');
            particle.style.setProperty('--dy', Math.random() * -50 - 20 + 'px');
            
            document.body.appendChild(particle);
            
            particle.addEventListener('animationend', () => {
                particle.remove();
            });
        }
    }
    
    showMenu(menuName, options = {}) {
        const menu = this.menus[menuName];
        if (!menu) return;
        
        // Hide current menu
        if (this.currentMenu && this.menus[this.currentMenu]) {
            this.hideMenu(this.currentMenu);
        }
        
        // Show new menu
        menu.classList.remove('hidden');
        
        if (this.transitions) {
            menu.style.opacity = '0';
            menu.style.transform = 'scale(0.9)';
            
            requestAnimationFrame(() => {
                menu.style.transition = 'all 0.3s ease';
                menu.style.opacity = '1';
                menu.style.transform = 'scale(1)';
            });
        }
        
        this.currentMenu = menuName;
        
        // Execute callback if provided
        if (options.onShow) {
            options.onShow();
        }
    }
    
    hideMenu(menuName) {
        const menu = this.menus[menuName];
        if (!menu) return;
        
        if (this.transitions) {
            menu.style.transition = 'all 0.3s ease';
            menu.style.opacity = '0';
            menu.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                menu.classList.add('hidden');
                menu.style.opacity = '';
                menu.style.transform = '';
            }, 300);
        } else {
            menu.classList.add('hidden');
        }
    }
    
    pushMenu(menuName) {
        this.menuStack.push(this.currentMenu);
        this.showMenu(menuName);
    }
    
    popMenu() {
        if (this.menuStack.length > 0) {
            const previousMenu = this.menuStack.pop();
            this.showMenu(previousMenu);
        }
    }
    
    createNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '-300px',
            padding: '15px 25px',
            borderRadius: '10px',
            backgroundColor: this.getNotificationColor(type),
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            transition: 'right 0.3s ease',
            zIndex: '10000'
        });
        
        document.body.appendChild(notification);
        
        // Slide in
        requestAnimationFrame(() => {
            notification.style.right = '20px';
        });
        
        // Auto remove
        setTimeout(() => {
            notification.style.right = '-300px';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    
    getNotificationColor(type) {
        const colors = {
            info: '#0099ff',
            success: '#00ff00',
            warning: '#ffaa00',
            error: '#ff0000'
        };
        return colors[type] || colors.info;
    }
    
    createConfirmDialog(message, onConfirm, onCancel) {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <p>${message}</p>
                <div class="dialog-buttons">
                    <button class="dialog-button confirm">確認</button>
                    <button class="dialog-button cancel">キャンセル</button>
                </div>
            </div>
        `;
        
        // Style the dialog
        Object.assign(dialog.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '9999'
        });
        
        document.body.appendChild(dialog);
        
        // Add event listeners
        dialog.querySelector('.confirm').addEventListener('click', () => {
            dialog.remove();
            if (onConfirm) onConfirm();
        });
        
        dialog.querySelector('.cancel').addEventListener('click', () => {
            dialog.remove();
            if (onCancel) onCancel();
        });
        
        // Close on background click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
                if (onCancel) onCancel();
            }
        });
    }
    
    createLoadingOverlay(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '9998'
        });
        
        document.body.appendChild(overlay);
        
        return {
            update: (newMessage) => {
                overlay.querySelector('p').textContent = newMessage;
            },
            remove: () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            }
        };
    }
    
    animateScore(element, from, to, duration = 1000) {
        const start = performance.now();
        const diff = to - from;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(from + diff * easeOutQuart);
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    createRankDisplay(rank, total) {
        const percentage = ((total - rank + 1) / total) * 100;
        let rankClass = 'rank-bronze';
        let rankText = 'Bronze';
        
        if (percentage >= 90) {
            rankClass = 'rank-grandmaster';
            rankText = 'Grandmaster';
        } else if (percentage >= 80) {
            rankClass = 'rank-master';
            rankText = 'Master';
        } else if (percentage >= 70) {
            rankClass = 'rank-diamond';
            rankText = 'Diamond';
        } else if (percentage >= 60) {
            rankClass = 'rank-platinum';
            rankText = 'Platinum';
        } else if (percentage >= 50) {
            rankClass = 'rank-gold';
            rankText = 'Gold';
        } else if (percentage >= 40) {
            rankClass = 'rank-silver';
            rankText = 'Silver';
        }
        
        return `<span class="${rankClass}">${rankText} (Top ${percentage.toFixed(1)}%)</span>`;
    }
}