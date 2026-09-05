# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.13](https://github.com/sotoblanco/BaseLayer/compare/v0.1.12...v0.1.13) (2026-09-05)


### Features

* add local AI key onboarding, status configuration endpoints, and learning modalities guide ([6b3a0a1](https://github.com/sotoblanco/BaseLayer/commit/6b3a0a1885e0581f282ddca7266a7021fbabbf30))


### Bug Fixes

* **lint:** remove unused imports and format ai router ([2d0af15](https://github.com/sotoblanco/BaseLayer/commit/2d0af15fb89de01ff72b674ccbcd7efe6d536432))

### [0.1.12](https://github.com/sotoblanco/BaseLayer/compare/v0.1.11...v0.1.12) (2026-09-05)

### [0.1.11](https://github.com/sotoblanco/BaseLayer/compare/v0.1.10...v0.1.11) (2026-09-05)


### Bug Fixes

* require auth and rate-limit POST /ai/discuss ([e89032b](https://github.com/sotoblanco/BaseLayer/commit/e89032b0a91a241abd202f281153870859b7c5b1)), closes [#27](https://github.com/sotoblanco/BaseLayer/issues/27)

### [0.1.10](https://github.com/sotoblanco/BaseLayer/compare/v0.1.9...v0.1.10) (2026-09-05)


### Features

* local welcome asks for a name instead of login ([eb10ad4](https://github.com/sotoblanco/BaseLayer/commit/eb10ad4e4deee0bc3df20286dab3aa49a8f97870)), closes [#23](https://github.com/sotoblanco/BaseLayer/issues/23)


### Bug Fixes

* generate a real SECRET_KEY when starting local or Docker dev ([c5d5e91](https://github.com/sotoblanco/BaseLayer/commit/c5d5e910eae52f29e8abd395ee5f3317423728ee))

### [0.1.9](https://github.com/sotoblanco/BaseLayer/compare/v0.1.8...v0.1.9) (2026-09-05)


### Bug Fixes

* load solution code only when the user asks for it ([58c2a8d](https://github.com/sotoblanco/BaseLayer/commit/58c2a8de5254ee40efe7913faf18f4b1a7427c9d)), closes [#26](https://github.com/sotoblanco/BaseLayer/issues/26)

### [0.1.8](https://github.com/sotoblanco/BaseLayer/compare/v0.1.7...v0.1.8) (2026-09-05)


### Bug Fixes

* run student code and tests as separate files ([987c5b5](https://github.com/sotoblanco/BaseLayer/commit/987c5b5be3fdb163a2d3bb24c3f9ea35442807df)), closes [#7](https://github.com/sotoblanco/BaseLayer/issues/7)

### [0.1.7](https://github.com/sotoblanco/BaseLayer/compare/v0.1.6...v0.1.7) (2026-09-05)


### Bug Fixes

* stop sending reference solutions to the AI tutor ([20a96e9](https://github.com/sotoblanco/BaseLayer/commit/20a96e9df1dc5fd90be47f00d97dfa2fa148992f)), closes [#13](https://github.com/sotoblanco/BaseLayer/issues/13)
* wire classic Reset and reset lesson index on prev chapter ([76c77d0](https://github.com/sotoblanco/BaseLayer/commit/76c77d084a535d0416cf8d2643b7e3c41bb1c4b6)), closes [#8](https://github.com/sotoblanco/BaseLayer/issues/8) [#9](https://github.com/sotoblanco/BaseLayer/issues/9)

### [0.1.6](https://github.com/sotoblanco/BaseLayer/compare/v0.1.5...v0.1.6) (2026-09-05)


### Features

* add Google sign-in on login and signup pages ([d70139b](https://github.com/sotoblanco/BaseLayer/commit/d70139b12bbc7ebcd0822f3ab90ed8ff3dd9e48b)), closes [#1](https://github.com/sotoblanco/BaseLayer/issues/1) [#14](https://github.com/sotoblanco/BaseLayer/issues/14)


### Bug Fixes

* add UX Light sign-out menu and stop release tag races ([8be5ffa](https://github.com/sotoblanco/BaseLayer/commit/8be5ffa804d9c3e8711c65961bf847208aadbf6b)), closes [#15](https://github.com/sotoblanco/BaseLayer/issues/15)
* do not ship a copy-pastable SECRET_KEY in .env.example ([2c8f1ce](https://github.com/sotoblanco/BaseLayer/commit/2c8f1ce2d3188244cd0066251e3a1ed978edfc9d))
* drop role from UserCreate so signup cannot accept it ([32bdcd3](https://github.com/sotoblanco/BaseLayer/commit/32bdcd31206524a6edf82f93876597502f2cc297))
* fail fast when JWT SECRET_KEY is missing or uses default placeholder ([f667748](https://github.com/sotoblanco/BaseLayer/commit/f66774891707e435237e7bf281079f89ebadc349)), closes [#11](https://github.com/sotoblanco/BaseLayer/issues/11)
* ignore role on public signup so users cannot self-assign admin ([888c6b5](https://github.com/sotoblanco/BaseLayer/commit/888c6b5738b535544da102af820502d247743283)), closes [#10](https://github.com/sotoblanco/BaseLayer/issues/10)
* require auth, size cap, and rate limit on /run ([7e29745](https://github.com/sotoblanco/BaseLayer/commit/7e297456f83a3153b8054bdb7f98fef7fed728bb)), closes [#12](https://github.com/sotoblanco/BaseLayer/issues/12)

### [0.1.5](https://github.com/sotoblanco/BaseLayer/compare/v0.1.4...v0.1.5) (2026-09-03)

### [0.1.4](https://github.com/sotoblanco/BaseLayer/compare/v0.1.3...v0.1.4) (2026-04-05)

### [0.1.3](https://github.com/sotoblanco/BaseLayer/compare/v0.1.2...v0.1.3) (2026-03-30)

### [0.1.2](https://github.com/sotoblanco/BaseLayer/compare/v0.1.1...v0.1.2) (2026-03-29)

### 0.1.1 (2026-03-29)


### Features

* Add file-based course loading from courses/ folder ([bf3d068](https://github.com/sotoblanco/BaseLayer/commit/bf3d0689b93937bdbe09dcf233f355ddec68ad33))


### Bug Fixes

* Add Modal production URL to CORS origins ([64e0c5d](https://github.com/sotoblanco/BaseLayer/commit/64e0c5d3367744a99daeea5409554974a9d7abde))
