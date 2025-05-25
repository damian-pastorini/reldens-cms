
-- Default admin user:

REPLACE INTO `users` (`id`, `email`, `username`, `password`, `role_id`, `status`)
VALUES (
    1,
   'root@cms-admin.com',
   'root',
   'd35ed1c81c3ff00de15309fe40a90c32:a39a9231a69fefef274c13c1780a7447672a5fee8250ce22a51bb20275039dda63a54faa1e5fd775becb3ac424f571d5b996001305bb7d63e038111dce08d45b',
   99,
   '1'
);
