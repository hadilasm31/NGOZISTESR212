// =====================================================
// CONFIGURATION SUPABASE CENTRALISÉE
// =====================================================

const SUPABASE_URL = 'https://gkvtwxnddpgoyrpedhua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdnR3eG5kZHBnb3lycGVkaHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODA0MzAsImV4cCI6MjA4NzU1NjQzMH0.iTSfiOGCFky2fk6JXubFRBK8A0sVGfqMqALzD0og1KM';

// Initialiser Supabase
const { createClient } = window.supabase;
window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase initialisé avec succès');

// =====================================================
// GESTIONNAIRE D'AUTHENTIFICATION CENTRALISÉ
// =====================================================

window.AuthManager = {
    // Vérifier l'utilisateur courant
    async getCurrentUser() {
        try {
            const { data: { session }, error } = await window.supabase.auth.getSession();
            
            if (error || !session) {
                return { user: null, session: null };
            }

            const { data: userData, error: userError } = await window.supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (userError || !userData) {
                return { user: null, session };
            }

            // Mettre en cache
            try {
                localStorage.setItem('current_user', JSON.stringify({
                    id: userData.id,
                    email: userData.email,
                    nom: userData.nom,
                    prenom: userData.prenom,
                    role: userData.role,
                    photo: userData.photo,
                    status: userData.status
                }));
            } catch (e) {}

            return { user: userData, session };
        } catch (error) {
            console.error('Erreur getCurrentUser:', error);
            return { user: null, session: null };
        }
    },

    // Vérifier l'authentification avec redirection
    async requireAuth(allowedRoles = null) {
        const { user, session } = await this.getCurrentUser();
        
        if (!session || !user) {
            window.location.href = '/login.html';
            return null;
        }

        // Vérifier le statut
        if (user.status === 'pending') {
            await window.supabase.auth.signOut();
            window.location.href = '/login.html?status=pending';
            return null;
        }

        if (user.status === 'inactive') {
            await window.supabase.auth.signOut();
            window.location.href = '/login.html?status=inactive';
            return null;
        }

        // Vérifier les rôles autorisés
        if (allowedRoles) {
            const hasAccess = allowedRoles.some(role => {
                if (role === 'admin') return ['admin', 'super_admin'].includes(user.role);
                if (role === 'super_admin') return user.role === 'super_admin';
                if (role === 'member') return user.role === 'member';
                return user.role === role;
            });

            if (!hasAccess) {
                if (user.role === 'admin' || user.role === 'super_admin') {
                    window.location.href = '/admin/dashboard.html';
                } else if (user.role === 'member') {
                    window.location.href = '/member/dashboard.html';
                } else {
                    window.location.href = '/index.html';
                }
                return null;
            }
        }

        return user;
    },

    // Rediriger vers le bon dashboard
    async redirectToDashboard() {
        const { user } = await this.getCurrentUser();
        
        if (!user) {
            window.location.href = '/login.html';
            return;
        }

        if (user.role === 'super_admin' || user.role === 'admin') {
            window.location.href = '/admin/dashboard.html';
        } else if (user.role === 'member') {
            window.location.href = '/member/dashboard.html';
        } else {
            window.location.href = '/index.html';
        }
    },

    // Déconnexion
    async logout() {
        await window.supabase.auth.signOut();
        localStorage.removeItem('current_user');
        localStorage.removeItem('rememberedEmail');
        window.location.href = '/index.html';
    }
};

// =====================================================
// FONCTIONS UTILITAIRES GLOBALES
// =====================================================

window.logout = window.AuthManager.logout;

window.showToast = function(message, type = 'info', duration = 3000) {
    let toast = document.querySelector('.toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
        
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = '8px';
        toast.style.color = 'white';
        toast.style.zIndex = '3000';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
    }
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };
    
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.textContent = message;
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
    }, duration);
};

window.truncateText = function(text, maxLength = 100) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

window.getCategoryLabel = function(category) {
    const labels = {
        'environnement': 'Environnement',
        'social': 'Social',
        'culture': 'Culture',
        'education': 'Éducation',
        'general': 'Général'
    };
    return labels[category] || 'Général';
};
