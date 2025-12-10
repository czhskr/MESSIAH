/**
 * WaveSystem.js - 웨이브 관리 시스템 모듈
 * 웨이브 진행, 적 스폰, 보스 전을 관리합니다.
 */

const WaveSystem = {
  // 현재 웨이브 정보
  currentWave: 1,
  maxWave: 0, // 스테이지별 최대 웨이브
  waveTimer: 0, // 웨이브 타이머
  waveDuration: 60, // 웨이브 지속 시간
  enemiesRemaining: 0,
  isBossWave: false,
  isWaveActive: false,
  spawnTimer: 0,
  spawnInterval: 0.5, // 적 스폰 간격
  
  // 적 타입별 스폰 타이머
  enemySpawnTimers: {
    malakh: 0,    // 말라크: 5초마다 (4 + 웨이브)마리
    power: 0,     // 파워: 5초마다 (0 + 웨이브)마리
    dominion: 0,  // 도미니온: 10초마다 (1 + 웨이브)마리
    fiend: 0,     // 핀드: 5초마다 (4 + 웨이브)마리
    cultist: 0,   // 컬티스트: 5초마다 (0 + 웨이브)마리
    nightmare: 0  // 나이트메어: 10초마다 (1 + 웨이브)마리
  },
  
  // 스폰 예정 적 목록 (등장 표시용)
  pendingSpawns: [], // {x, y, spawnTime, type}
  
  /**
   * 초기화
   */
  init() {
    this.currentWave = 1;
    this.waveTimer = 0;
    this.enemiesRemaining = 0;
    this.isBossWave = false;
    this.isWaveActive = false;
    this.spawnTimer = 0;
    this.pendingSpawns = [];
    
    // 적 타입별 스폰 타이머 초기화
    this.enemySpawnTimers = {
      malakh: 0,
      power: 0,
      dominion: 0,
      fiend: 0,
      cultist: 0,
      nightmare: 0
    };
    
    // 스테이지별 최대 웨이브 설정
    this.updateMaxWave();
  },
  
  /**
   * 스테이지별 최대 웨이브 설정
   */
  updateMaxWave() {
    const stage = GameState.currentStage;
    let maxWave = 10; // 기본값
    
    if (stage === 2) {
      maxWave = 20; // 스테이지 2: 20웨이브
    } else if (stage === 99) {
      maxWave = 999; // 테스트 스테이지: 무제한
    }
    
    this.maxWave = maxWave;
    GameState.maxWave = maxWave;
  },
  
  /**
   * 웨이브 시작
   */
  startWave(waveNumber) {
    this.currentWave = waveNumber;
    GameState.wave = waveNumber;
    this.waveTimer = 0;
    this.isWaveActive = true;
    this.spawnTimer = 0;
    this.pendingSpawns = [];
    
    // 적 타입별 스폰 타이머 초기화 (웨이브 시작 시 즉시 스폰되도록)
    this.enemySpawnTimers = {
      malakh: 0,
      power: 0,
      dominion: 0,
      fiend: 0,
      cultist: 0,
      nightmare: 0
    };
    
    // 스테이지별 최대 웨이브 업데이트
    this.updateMaxWave();
    
    // 마지막 웨이브에 보스 등장
    if (waveNumber === this.maxWave) {
      this.isBossWave = true;
      console.log(`[WaveSystem] 마지막 웨이브 ${waveNumber}/${this.maxWave} - 보스 등장`);
      this.spawnBoss();
      // 보스 웨이브는 일반 적 스폰하지 않음
    } else {
      this.isBossWave = false;
      // 일반 적 스폰 시작
      this.scheduleEnemySpawns();
    }
    
    console.log(`[WaveSystem] 웨이브 ${waveNumber} 시작`);
  },
  
  /**
   * 적 스폰 스케줄링 (플레이어 주변 랜덤 위치)
   * 각 타입별로 주기적으로 스폰
   */
  scheduleEnemySpawns() {
    if (!Player) return;
    
    const spawnRadius = 900; // 플레이어 주변 스폰 반경 (더 넓게)
    const spawnDelay = 1.0; // 등장 표시 후 1초 뒤 실제 등장
    
    // 배경에 따라 적 타입 선택
    const backgroundType = MapSystem.getCurrentBackgroundType();
    
    // 웨이브별 적 수 계산 (웨이브마다 +1)
    const wave = this.currentWave;
    
    // 말라크: 5초마다 (4 + 웨이브)마리 (웨이브 1: 5마리, 웨이브 2: 6마리, ...)
    if (this.enemySpawnTimers.malakh <= 0 && backgroundType === 'heaven') {
      this.enemySpawnTimers.malakh = 5.0; // 타이머 리셋
      const count = 4 + wave;
      for (let i = 0; i < count; i++) {
        const spawn = this.createSpawnPoint('malakh', spawnRadius, spawnDelay);
        if (spawn) {
          this.pendingSpawns.push(spawn);
        }
      }
    }
    
    // 파워: 5초마다 (0 + 웨이브)마리 (웨이브 1: 1마리, 웨이브 2: 2마리, ...)
    if (this.enemySpawnTimers.power <= 0 && backgroundType === 'heaven') {
      this.enemySpawnTimers.power = 5.0; // 타이머 리셋
      const count = 0 + wave;
      for (let i = 0; i < count; i++) {
        const spawn = this.createSpawnPoint('power', spawnRadius, spawnDelay);
        if (spawn) {
          this.pendingSpawns.push(spawn);
        }
      }
    }
    
    // 도미니온: 10초마다 (1 + 웨이브)마리 (웨이브 1: 2마리, 웨이브 2: 3마리, ...)
    if (this.enemySpawnTimers.dominion <= 0 && backgroundType === 'heaven') {
      this.enemySpawnTimers.dominion = 10.0; // 타이머 리셋
      const count = 1 + wave;
      for (let i = 0; i < count; i++) {
        const spawn = this.createSpawnPoint('dominion', spawnRadius, spawnDelay);
        if (spawn) {
          this.pendingSpawns.push(spawn);
        }
      }
    }
    
    // 악마 적 (지옥 배경)
    if (backgroundType === 'hell') {
      // 핀드: 5초마다 (4 + 웨이브)마리 (웨이브 1: 5마리, 웨이브 2: 6마리, ...)
      if (this.enemySpawnTimers.fiend <= 0) {
        this.enemySpawnTimers.fiend = 5.0; // 타이머 리셋
        const count = 4 + wave;
        for (let i = 0; i < count; i++) {
          const spawn = this.createSpawnPoint('fiend', spawnRadius, spawnDelay);
          if (spawn) {
            this.pendingSpawns.push(spawn);
          }
        }
      }
      
      // 컬티스트: 5초마다 (0 + 웨이브)마리 (웨이브 1: 1마리, 웨이브 2: 2마리, ...)
      if (this.enemySpawnTimers.cultist <= 0) {
        this.enemySpawnTimers.cultist = 5.0; // 타이머 리셋
        const count = 0 + wave;
        for (let i = 0; i < count; i++) {
          const spawn = this.createSpawnPoint('cultist', spawnRadius, spawnDelay);
          if (spawn) {
            this.pendingSpawns.push(spawn);
          }
        }
      }
      
      // 나이트메어: 10초마다 (1 + 웨이브)마리 (웨이브 1: 2마리, 웨이브 2: 3마리, ...)
      if (this.enemySpawnTimers.nightmare <= 0) {
        this.enemySpawnTimers.nightmare = 10.0; // 타이머 리셋
        const count = 1 + wave;
        for (let i = 0; i < count; i++) {
          const spawn = this.createSpawnPoint('nightmare', spawnRadius, spawnDelay);
          if (spawn) {
            this.pendingSpawns.push(spawn);
          }
        }
      }
    }
  },
  
  /**
   * 스폰 위치 생성 (플레이어와 최소 거리 유지)
   */
  createSpawnPoint(type, spawnRadius, spawnDelay) {
    if (!Player) return null;
    
    const minDistance = 600; // 플레이어와 최소 거리
    const maxAttempts = 20; // 최대 시도 횟수
    
    // 최소 거리를 만족하는 위치 찾기
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 플레이어 주변 랜덤 위치 계산
      const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * Math.max(0, spawnRadius - minDistance);
      const x = Player.x + Math.cos(angle) * distance;
      const y = Player.y + Math.sin(angle) * distance;
      
      // 플레이어와의 거리 확인 (Math.sqrt 최적화)
      const dx = x - Player.x;
      const dy = y - Player.y;
      const distToPlayerSq = dx * dx + dy * dy;
      const minDistanceSq = minDistance * minDistance;
      
      // 최소 거리 체크
      if (distToPlayerSq >= minDistanceSq) {
        // 적들은 경계 밖에서도 스폰 가능 (경계 체크 제거)
        
        // 등장 표시 시간 계산 (1초 전부터 표시)
        const spawnTime = this.spawnTimer + spawnDelay;
        
        return {
          x: x,
          y: y,
          spawnTime: spawnTime,
          type: type,
          showMarker: true // 등장 표시 플래그
        };
      }
    }
    
    // 최소 거리를 만족하는 위치를 찾지 못한 경우 기본 위치 사용
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance;
    const x = Player.x + Math.cos(angle) * distance;
    const y = Player.y + Math.sin(angle) * distance;
    // 적들은 경계 밖에서도 스폰 가능 (경계 체크 제거)
    const spawnTime = this.spawnTimer + spawnDelay;
    
    return {
      x: x,
      y: y,
      spawnTime: spawnTime,
      type: type,
      showMarker: true
    };
  },
  
  /**
   * 웨이브 업데이트
   */
  update(dt) {
    // 테스트 스테이지에서는 웨이브 시스템 비활성화
    if (GameState.currentStage === 99) return;
    if (!this.isWaveActive) return;
    
    this.waveTimer += dt;
    this.spawnTimer += dt;
    
    // 말풍선 표시 중에는 적 생성 로직만 멈춤
    const isSpeechBubbleActive = SpeechBubble && SpeechBubble.isActive();
    
    // 적 타입별 스폰 타이머 업데이트 (말풍선 표시 중이 아닐 때만)
    if (!this.isBossWave && !isSpeechBubbleActive) {
      this.enemySpawnTimers.malakh -= dt;
      this.enemySpawnTimers.power -= dt;
      this.enemySpawnTimers.dominion -= dt;
      this.enemySpawnTimers.fiend -= dt;
      this.enemySpawnTimers.cultist -= dt;
      this.enemySpawnTimers.nightmare -= dt;
      
      // 주기적 스폰 스케줄링
      this.scheduleEnemySpawns();
    }
    
    // 등장 표시 업데이트 (말풍선 표시 중이 아닐 때만)
    if (!isSpeechBubbleActive) {
      this.updateSpawnMarkers(dt);
    }
    
    // 웨이브 시간 종료 체크 (보스 웨이브는 시간 제한 없음)
    if (!this.isBossWave && this.waveTimer >= this.waveDuration) {
      this.endWave();
      return;
    }
    
    // 활성 적 수 확인 (웨이브 시작 후 최소 2초가 지나야 체크, 그리고 최소 1번의 스폰 시도가 있었어야 함)
    if (!this.isBossWave && this.waveTimer >= 2.0 && this.spawnTimer >= 1.0) {
      const hasActiveEnemies = Enemy && Enemy.activeEnemies && Enemy.activeEnemies.length > 0;
      const hasPendingSpawns = this.pendingSpawns.length > 0;
      if (!hasActiveEnemies && !hasPendingSpawns) {
        // 모든 적 처치 시 웨이브 종료
        this.endWave();
      }
    }
  },
  
  /**
   * 등장 표시 업데이트
   */
  updateSpawnMarkers(dt) {
    for (let i = this.pendingSpawns.length - 1; i >= 0; i--) {
      const spawn = this.pendingSpawns[i];
      
      // 등장 시간 도달
      if (this.spawnTimer >= spawn.spawnTime) {
        // 실제 적 스폰
        Enemy.spawnEnemy(spawn.type, spawn.x, spawn.y, this.currentWave);
        this.pendingSpawns.splice(i, 1);
      }
    }
  },
  
  
  /**
   * 웨이브 종료
   */
  endWave() {
    this.isWaveActive = false;
    
    // 모든 적 제거
    if (Enemy && Enemy.activeEnemies && Enemy.activeEnemies.length > 0) {
      for (let i = Enemy.activeEnemies.length - 1; i >= 0; i--) {
        Enemy.despawn(Enemy.activeEnemies[i]);
      }
    }
    
    // 보스 제거
    if (BossSystem && BossSystem.currentBoss) {
      BossSystem.currentBoss = null;
    }
    
    // 다음 웨이브로
    if (this.currentWave < this.maxWave) {
      // 웨이브 클리어 애니메이션 시작
      if (window && window.WaveClearAnimation) {
        window.WaveClearAnimation.isActive = true;
        window.WaveClearAnimation.timer = 0;
        window.WaveClearAnimation.y = -200;
        window.WaveClearAnimation.bounce = 0;
        window.WaveClearAnimation.waveNumber = this.currentWave;
      }
      
      // 웨이브 클리어 사운드 재생
      try {
        const audioEl = ResourceLoader && ResourceLoader.getAudio
          ? ResourceLoader.getAudio('audio/wave_clear.mp3')
          : null;
        if (audioEl) {
          audioEl.currentTime = 0;
          audioEl.volume = 0.8;
          audioEl.play().catch(() => {});
        } else {
          const sfx = new Audio('audio/wave_clear.mp3');
          sfx.volume = 0.8;
          sfx.play().catch(() => {});
        }
      } catch (e) {
        // 사운드 실패 시 무시
      }
    } else {
      // 최종 웨이브 완료
      console.log('[WaveSystem] 모든 웨이브 완료!');
    }
  },
  
  /**
   * 다음 웨이브 시작
   */
  nextWave() {
    if (this.currentWave < this.maxWave) {
      // 웨이브 전환 시 최대체력의 30% 회복
      if (GameState && GameState.playerStats) {
        const stats = GameState.playerStats;
        const healAmount = stats.maxHp * 0.3;
        stats.hp = Math.min(stats.maxHp, stats.hp + healAmount);
      }
      this.startWave(this.currentWave + 1);
    }
  },
  
  /**
   * 보스 스폰
   */
  spawnBoss() {
    if (!Player || !BossSystem) {
      console.warn('[WaveSystem] 보스 스폰 실패: Player 또는 BossSystem이 없습니다.');
      return;
    }
    
    // 미카엘 보스 스폰
    const boss = { name: 'michael', category: 'angel' };
    
    // 보스 스폰 (맵 중앙)
    const spawnX = MapSystem.playableAreaSize / 2;
    const spawnY = MapSystem.playableAreaSize / 2;
    console.log(`[WaveSystem] 보스 스폰 시도: ${boss.name} (${boss.category}) at (${spawnX}, ${spawnY})`);
    const spawnedBoss = BossSystem.spawn(boss.name, boss.category, spawnX, spawnY);
    
    if (spawnedBoss) {
      console.log(`[WaveSystem] 보스 스폰 성공: ${boss.name}`);
    } else {
      console.error(`[WaveSystem] 보스 스폰 실패: ${boss.name}`);
    }
  },
  
  /**
   * 등장 표시 렌더링 (1초 전부터 빨간색으로 표시)
   */
  renderMarkers(ctx) {
    if (!this.isWaveActive) return;
    
    ctx.save();
    ctx.font = 'bold 40px Sam3KR, Arial, sans-serif'; // 크기 증가: 24px -> 40px
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (const spawn of this.pendingSpawns) {
      // 1초 전부터 표시
      const timeUntilSpawn = spawn.spawnTime - this.spawnTimer;
      if (timeUntilSpawn <= 1.0 && timeUntilSpawn > 0) {
        // 빨간색으로 표시
        ctx.fillStyle = '#ff0000';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3; // 외곽선 두께도 증가
        
        // 텍스트 그리기 (외곽선 포함)
        ctx.strokeText('<!>', spawn.x, spawn.y - 30);
        ctx.fillText('<!>', spawn.x, spawn.y - 30);
      }
    }
    
    ctx.restore();
  }
};
