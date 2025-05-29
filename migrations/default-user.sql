
-- Default admin user:

REPLACE INTO `users` (`id`, `email`, `username`, `password`, `role_id`, `status`)
VALUES (
    1,
   'root@cms-admin.com',
   'root',
   '879abc0494b36a09f184fd8308ea18f2643d71263f145b1e40e2ec3546d42202:6a186aff4d69daadcd7940a839856b394b12f0aec64a5df745c83cf9d881dc9dcb121b03d946872571f214228684216df097305b68417a56403299b8b2388db3',
   99,
   '1'
);
