/**
 *
 * Reldens - AdminTranslations
 *
 */

class AdminTranslations
{

    static appendTranslations(translations)
    {
        // @TODO - BETA - Fix translations, use snippets, include new snippets under the basic config script.
        let adminTranslations = {
            messages: {
                loginWelcome: 'CMS - Login',
                reldensTitle: 'Reldens - CMS',
                reldensSlogan: 'You can do it',
                reldensDiscordTitle: 'Join our Discord server!',
                reldensDiscordText: 'Talk with the creators and other Reldens users',
                reldensGithubTitle: 'Find us on GitHub!',
                reldensGithubText: 'Need a new feature?'
                    +' Would you like to contribute with code?'
                    +' Find the source code or create an issue in GitHub',
                reldensLoading: 'Loading...',
                confirmClearCacheMessage: 'Are you sure you want to clear all cache? This action cannot be undone.',
                clearCacheWarning: 'This will clear all cached routes and may impact site performance temporarily.'
            },
            labels: {
                navigation: 'Reldens - CMS',
                adminVersion: 'Admin: {{version}}',
                loginWelcome: 'Reldens',
                pages: 'Server Management',
                management: 'Management',
                shuttingDown: 'Server is shutting down in:',
                submitShutdownLabel: 'Shutdown Server',
                submitCancelLabel: 'Cancel Server Shutdown',
                cleanCache: 'Clean Cache',
                clearAllCache: 'Clear All Cache',
                confirmClearCache: 'Confirm Clear Cache',
                warning: 'Warning:',
                cancel: 'Cancel',
                confirm: 'Continue',
            }
        };
        for(let i of Object.keys(translations)){
            if(!adminTranslations[i]){
                adminTranslations[i] = {};
            }
            Object.assign(adminTranslations[i], translations[i]);
        }
        return adminTranslations;
    }

}

module.exports.AdminTranslations = AdminTranslations;
