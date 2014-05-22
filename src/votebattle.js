// Globals
var game;
var States = {};

// BOOT
window.onload = function() {
    game = new Phaser.Game(800, 100, Phaser.AUTO,
                           'vote-battle-container');
    game.state.add('boot', States.Boot);
    game.state.add('preload', States.Preload);
    game.state.add('title', States.Title);
    game.state.add('battle', States.Battle);
    game.state.start('boot');
}

States.Boot = function(game) {};
States.Boot.prototype = {
    preload: function() {
        this.load.image('preloaderBg', 'resources/preload-empty.png');
        this.load.image('preloaderBar', 'resources/preload-full.png');
    },
    create: function() {
        this.game.state.start('preload');
    }
};

// PRELOAD
States.Preload = function(game) {};
States.Preload.prototype = {
    preload: function() {
        this.game.stage.backgroundColor = '#16181a';
        this.preloadBg = this.add.sprite(game.width / 2,
            game.height / 2, 'preloaderBg');
        this.preloadBg.anchor.set(0.5);
        this.preloadBar = this.add.sprite(game.width / 2,
            game.height / 2, 'preloaderBar');
        this.preloadBar.x -= this.preloadBar.width / 2;
        this.preloadBar.anchor.y = 0.5;

        this.load.setPreloadSprite(this.preloadBar);

        game.load.spritesheet("sound", "resources/sound.png", 64, 67, 2);
        game.load.audio('bgmusic', 'resources/DST-1990.ogg');
        game.load.image('title', 'resources/title.png');
        game.load.image('snoo', 'resources/snoo.png');
        game.load.image('upvote', 'resources/upvote.png');
        game.load.image('upvote-small', 'resources/upvote-small.png');
        game.load.image('downvote', 'resources/downvote.png');
        game.load.image('downvote-small', 'resources/downvote-small.png');
        game.load.image('downvote-big', 'resources/downvote-big.png');
        game.load.image('cloud', 'resources/cloud.png');
        game.load.image('red', 'resources/red.png');
        game.load.image('black', 'resources/black.png');
    },

    create: function() {
        game.state.start('title');
    }

}

// TITLE
States.Title = function(game) {
}

States.Title.prototype = {

    create: function() {
        game.stage.backgroundColor = 0x57d7e1;

        var title = game.add.sprite(game.width / 2, game.height / 2, 'title');
        title.anchor.set(0.5);
        title.inputEnabled = true;
        title.events.onInputDown.add(this.startGame, this);

        var startstyle = {
            font: 'bold 14pt sans-serif',
            fill: 'white',
            stroke: 'black',
            strokeThickness: 1
        };

        var start = game.add.text(game.width,
            game.height, "Click to begin", startstyle);
        start.anchor.setTo(1, 1);
        start.inputEnabled = true;
        start.events.onInputDown.add(this.startGame, this);

        this.sound = game.add.sprite(game.width, 0, 'sound');
        this.sound.anchor.x = 1;
        this.sound.frame = 1;
        this.sound.inputEnabled = true;
        this.sound.events.onInputDown.add(this.toggleSound, this);

        this.music = game.add.text(this.sound.x - this.sound.width,
            this.sound.y, "Music by DST", startstyle);
        this.music.anchor.setTo(1, 0);
        this.music.visible = false;

        if(game.globalSoundEnabled) {
            // Probably a restart; toggle the button
            this.toggleSound();
        }

    },

    update: function() {
    },

    startGame: function() {
        game.state.start('battle');
    },

    toggleSound: function() {
        var newFrame = (this.sound.frame + 1) % 2;
        this.sound.frame = newFrame;
        game.globalSoundEnabled = (newFrame == 0);
        this.music.visible = game.globalSoundEnabled;
    }
}

// BATTLE
/**
 * @constructor
 */
States.Battle = function(game) {
    this.initial_time_between_downvotes = 750;
    this.time_between_downvotes = 750;
    this.baseKillsUntilBoss = 10;
    this.killsUntilBoss = this.baseKillsUntilBoss;
};

States.Battle.prototype = {

    create: function() {
        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.stage.backgroundColor = 0x87CEFA;

        this.clouds = game.add.group();
        this.clouds.enableBody = true;
        this.spawnClouds();

        this.player = game.add.sprite(0, 0, 'snoo');
        this.player.lives = 3;
        this.player.karma = 0;
        game.physics.arcade.enable(this.player);

        this.upvotes = game.add.group();
        this.upvotes.enableBody = true;

        this.downvotes = game.add.group();
        this.downvotes.enableBody = true;

        this.boss = game.add.sprite(game.width, game.height / 2,
            'downvote-big');
        this.boss.maxHealth = 5;
        game.physics.arcade.enable(this.boss);
        this.boss.anchor.y = 0.5;
        this.boss.kill();  // rez later

        this.emitter = game.add.emitter();
        this.emitter.maxParticleSpeed.set(500);
        this.emitter.minParticleSpeed.set(-500);
        this.emitter.makeParticles(['upvote-small', 'downvote-small']);

        var bigstyle = {
            font: 'bold 36pt serif',
            fill: 'red',
            stroke: 'black',
            strokeThickness: 1
        };

        this.gameover = game.add.text(game.width / 2,
            game.height / 2, "Game Over", bigstyle);
        this.gameover.anchor.set(0.5);
        this.gameover.visible = false;

        var startstyle = {
            font: 'bold 16pt sans-serif',
            fill: 'white',
            stroke: 'black',
            strokeThickness: 1
        };

        this.returningToTitle=3;
        this.restart = game.add.text(game.width,
            game.height, "Ready in: 3", startstyle);
        this.restart.anchor.setTo(1, 1);
        this.restart.visible = false;

        var lifestyle = {
            font: 'bold 36pt serif',
            fill: 'white',
            stroke: 'black',
            strokeThickness: 1
        }
        this.livesText = game.add.text(game.width / 2,
            game.height / 2, "Lives: " + this.player.lives,
            lifestyle);
        this.livesText.anchor.set(0.5);

        this.bossBar = game.add.group();
        this.black = this.bossBar.create(0, 0, 'black');
        this.black.scale.setTo(game.width, 13);

        this.red = this.bossBar.create(0, 0, 'red');
        this.red.scale.setTo(game.width / 4, 13);

        var karmastyle = {
            font: 'bold 12pt sans-serif',
            fill: 'white',
            stroke: 'black',
            strokeThickness: 1
        }
        this.karmaText = game.add.text(game.width/2,
            0, "Karma: 0", karmastyle)
        this.karmaText.anchor.setTo(0.5, 0);

        var bossText = game.add.text(game.width - 60, 0, 'BOSS', karmastyle);
        this.bossBar.add(bossText);
        this.bossBar.y = -20;

        game.input.onDown.add(this.shoot, this);

        this.music = game.add.audio('bgmusic', 1, true);
        if(game.globalSoundEnabled) {
            this.music.play();
        }

        this.spawnPlayer();
    },

    update: function() {
        // Move the player to match the mouse
        this.player.body.y = game.input.y - this.player.body.halfHeight;

        // Check upvote-downvote collisions
        game.physics.arcade.overlap(this.upvotes, this.downvotes,
            this.voteCollide, null, this);

        // Downvote-player collisions
        game.physics.arcade.overlap(this.player, this.downvotes,
            this.killPlayer, null, this);

        // BOSS FIGHT!
        game.physics.arcade.overlap(this.boss, this.upvotes,
            this.bossHit, null, this);
    },

    blinkPlayer: function() {
        this.player.visible = !this.player.visible;
    },

    bossHit: function(boss, upvote) {
        this.explodeAt(boss.x + boss.body.halfWidth, boss.y);
        upvote.kill();
        this.updateBossHealth(-1);
        if(this.boss.health <= 0) {
            this.explodeAt(boss.x + boss.body.halfWidth, boss.y, 50);
            this.bossBar.y = -20;
            this.killsUntilBoss = this.baseKillsUntilBoss;
            this.boss.maxHealth += 1;  // We'll be back....
            this.updateKarma(100);
            this.boss.kill();
        }
    },

    countdownToRestart: function() {
        this.returningToTitle -= 1;
        if(this.returningToTitle <= 0) {
            this.restart.setText("Click to return to title");
        } else {
            this.restart.setText("Ready in: " +
                this.returningToTitle);
        }

    },

    despawnAll: function(group) {
        group.forEach(function(sprite) {
            sprite.kill();
        }, this);
    },

    explodeAt: function(x, y, particles) {
        this.emitter.x = x;
        this.emitter.y = y;
        if(!particles) particles = 10;
        this.emitter.start(true, 500, null, particles);
    },

    initCloud: function(cloud) {
        cloud.body.velocity.x = game.rnd.integerInRange(-100, -150);
    },

    killPlayer: function() {
        this.explodeAt(this.player.x + this.player.body.halfWidth,
            this.player.y + this.player.body.halfHeight);
        this.player.kill();
        this.despawnAll(this.upvotes);
        this.despawnAll(this.downvotes);
        game.time.events.remove(this.downvoter);

        this.player.lives -= 1;
        if(this.player.lives > 0) {
            this.livesText.setText("Lives: " + this.player.lives);
            this.livesText.visible = true;
            this.spawnPlayer();
        } else {
            this.gameover.visible = true;
            this.restart.visible = true;

            var fadeout = game.add.tween(this.music);
            fadeout.to({volume: 0}, 1000);
            fadeout.start();

            game.time.events.repeat(Phaser.Timer.SECOND, 3,
                this.countdownToRestart, this);
        }
    },

    respawnCloud: function(cloud) {
        cloud.kill();
        var new_y = game.rnd.integerInRange(-40, game.height - 20);
        cloud.reset(game.width, new_y);
        this.initCloud(cloud);
    },

    restartGame: function() {
        this.music.stop();
        game.state.start('title');
    },

    shoot: function() {
        // Special case:  If the game's over, return to title
        if(this.returningToTitle <= 0) {
            this.restartGame();
        }
        // Can only shoot one shot at a time!
        if(this.upvotes.countLiving() > 0) return;
        if(!this.player.alive) return;
        var x = this.player.body.x + this.player.body.width;
        var y = this.player.body.y;

        var upvote = this.spawnSprite(this.upvotes, x, y, 'upvote');
        upvote.body.velocity.x = 600
        upvote.checkWorldBounds = true;
        upvote.outOfBoundsKill = true;
    },

    spawnBoss: function() {
        this.boss.reset(game.width, game.height / 2, this.boss.maxHealth);
        this.updateBossHealth(0);
        this.boss.body.velocity.x = -25;

        var scroll = game.add.tween(this.bossBar);
        scroll.to({y: 0}, 2000);
        scroll.start();
    },

    spawnClouds: function() {
        for(var i=0; i < 5; i++) {
            var x = game.rnd.integerInRange(0, game.width);
            var y = game.rnd.integerInRange(-40, game.height - 20);
            var cloud = this.clouds.create(x, y, 'cloud');
            cloud.checkWorldBounds = true;
            cloud.events.onOutOfBounds.add(this.respawnCloud.bind(this));
            this.initCloud(cloud);
        }
    },

    spawnDownvote: function() {
        var y;
        var x;
        x = game.width - 1;
        if(this.boss.alive) {
            x = this.boss.x;
        }
        y = game.rnd.integerInRange(0, game.height - 20);

        var downvote = this.spawnSprite(this.downvotes, x, y, 'downvote',
            function(dv) {
                dv.checkWorldBounds = true;
                dv.events.onOutOfBounds.add(function() {
                    this.updateKarma(-1);
                    dv.kill();
                }, this);
            }.bind(this));
        downvote.body.velocity.x = -500;
        if(this.boss.alive) {
            game.physics.arcade.moveToObject(downvote, this.player, 500);
        }
    },

    spawnPlayer: function() {
        var x = 0;
        var y = game.height / 2 - this.player.body.halfHeight;
        this.player.reset(x, y);
        this.player.invulnerable = true;
        var blinks = 10;
        var invulnTime = 2500;
        var time_between_blinks = invulnTime / blinks;
        game.time.events.repeat(time_between_blinks, blinks, this.blinkPlayer,
            this);
        game.time.events.add(invulnTime, this.startLevel, this);
    },

    spawnSprite: function(group, x, y, spriteName, callback) {
        var item = group.getFirstDead();
        if(item) {
            item.reset(x, y);
        } else {
            item = group.create(x, y, spriteName);
            if(callback) callback(item);
        }
        return item;
    },

    startLevel: function() {
        this.player.invulnerable = false;
        // Start fighting
        this.downvoter = game.time.events.loop(this.time_between_downvotes,
            this.spawnDownvote,
            this);
        this.livesText.visible = false;
    },

    updateBossHealth: function(dBossHealth) {
        this.boss.health += dBossHealth;
        if(this.boss.health > 0) {
            var pct = this.boss.health / this.boss.maxHealth;
            this.red.scale.x = pct * this.game.width;
        }
    },

    updateKarma: function(dKarma) {
        this.player.karma += dKarma;
        this.karmaText.setText("Karma: " + this.player.karma);
    },

    voteCollide: function(upvote, downvote) {
        this.explodeAt(upvote.x, upvote.y);
        upvote.kill();
        downvote.kill();
        this.updateKarma(10);
        this.killsUntilBoss -= 1;
        if(!this.boss.alive && this.killsUntilBoss <= 0) {
            this.spawnBoss();
        }
    }
};
