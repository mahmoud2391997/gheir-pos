ALTER TABLE `users`
  ADD COLUMN `username` varchar(64),
  ADD COLUMN `passwordHash` varchar(255);

CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);

