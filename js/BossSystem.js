/**
 * BossSystem.js - 보스 시스템 모듈
 * 미카엘 보스 전용
 */

const BossSystem = {
  // 현재 보스
  currentBoss: null,
  activeBosses: [],
  
  // Quake 이펙트 시스템
  quakeEffects: [],
  quakeSprites: [],
  
  // Target 이미지
  targetImage: null,
  
  // 미카엘 스킬2 원 경고 반지름 (데미지 범위와 동일)
  CIRCLE_WARNING_RADIUS: 150,
  
  // 보스 타입 정의 (미카엘만)
  bosses: {
    michael: {
      name: '미카엘',
      category: 'angel',
      baseHp: 140000,
      baseDamage: 30,
      speed: 50,
      gold: 150,
      exp: 80,
      width: 400,
      height: 400,
      color: '#ffff99',
      imagePath: 'images/enemy/michael/michael.png',
      skills: ['dash', 'diveAttackEnhanced'],
      moveImagePath: 'images/enemy/michael/michael_move.png',
      dashImagePath: 'images/enemy/michael/michael_dash.png',
      deadImagePath: 'images/enemy/michael/michael_dead.png'
    }
  },
  
  // 오프스크린 캔버스 (이미지 여백 제거용)
  offscreenCanvas: null,
  offscreenCtx: null,
  
  /**
   * 초기화
   */
  init() {
    this.currentBoss = null;
    this.activeBosses = [];
    this.quakeEffects = [];
    
    // 오프스크린 캔버스 초기화
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 200;
    this.offscreenCanvas.height = 200;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    
    // Quake 스프라이트 로드
    this.loadQuakeSprites();
    
    // Target 이미지 로드
    this.loadTargetImage();
  },
  
  /**
   * Target 이미지 로드
   */
  async loadTargetImage() {
    const path = 'images/effect/target/target.png';
    // ResourceLoader에서 이미지 가져오기
    if (ResourceLoader && ResourceLoader.getImage) {
      this.targetImage = ResourceLoader.getImage(path);
      if (this.targetImage) {
        return;
      }
    }
    // ResourceLoader에 없으면 직접 로드
    const img = new Image();
    img.src = path;
    await new Promise((resolve) => {
      img.onload = () => {
        this.targetImage = img;
        resolve();
      };
      img.onerror = () => {
        console.warn(`[BossSystem] Target 이미지 로드 실패: ${path}`);
        resolve();
      };
    });
  },
  
  /**
   * Quake 스프라이트 로드
   */
  async loadQuakeSprites() {
    this.quakeSprites = [];
    for (let i = 1; i <= 6; i++) {
      const path = `images/effect/quake/frame_${String(i).padStart(3, '0')}.png`;
      // ResourceLoader에서 이미지 가져오기
      if (ResourceLoader && ResourceLoader.getImage) {
        const img = ResourceLoader.getImage(path);
        if (img) {
          this.quakeSprites.push(img);
          continue;
        }
      }
      // ResourceLoader에 없으면 직접 로드
      const img = new Image();
      img.src = path;
      await new Promise((resolve) => {
        img.onload = () => {
          this.quakeSprites.push(img);
          resolve();
        };
        img.onerror = () => {
          console.warn(`[BossSystem] Quake 스프라이트 로드 실패: ${path}`);
          resolve();
        };
      });
    }
  },
  
  /**
   * Quake 이펙트 생성
   */
  createQuakeEffect(x, y) {
    this.quakeEffects.push({
      x: x,
      y: y,
      frame: 0,
      timer: 0,
      frameTime: 0.1, // 각 프레임당 0.1초
      totalFrames: 6,
      active: true
    });
  },
  
  /**
   * Quake 이펙트 업데이트
   */
  updateQuakeEffects(dt) {
    for (let i = this.quakeEffects.length - 1; i >= 0; i--) {
      const effect = this.quakeEffects[i];
      if (!effect.active) {
        this.quakeEffects.splice(i, 1);
        continue;
      }
      
      effect.timer += dt;
      effect.frame = Math.floor(effect.timer / effect.frameTime);
      
      if (effect.frame >= effect.totalFrames) {
        effect.active = false;
      }
    }
  },
  
  /**
   * Quake 이펙트 렌더링
   */
  renderQuakeEffects(ctx) {
    const scale = 0.6; // 스프라이트 크기 80%로 축소
    
    for (const effect of this.quakeEffects) {
      if (!effect.active || effect.frame >= this.quakeSprites.length) continue;
      
      const sprite = this.quakeSprites[effect.frame];
      if (!sprite || !sprite.complete) continue;
      
      const scaledWidth = sprite.width * scale;
      const scaledHeight = sprite.height * scale;
      
      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.drawImage(sprite, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
      ctx.restore();
    }
  },
  
  /**
   * 보스 스폰
   */
  spawn(bossName, category, x, y) {
    const bossData = this.bosses[bossName];
    if (!bossData) {
      console.error(`[BossSystem] 보스 ${bossName}를 찾을 수 없습니다.`);
      return null;
    }
    
    this.currentBoss = {
      name: bossName,
      category: category,
      x: x,
      y: y,
      hp: bossData.baseHp,
      maxHp: bossData.baseHp,
      damage: bossData.baseDamage,
      speed: bossData.speed,
      gold: bossData.gold,
      exp: bossData.exp,
      width: bossData.width,
      height: bossData.height,
      color: bossData.color,
      imagePath: bossData.imagePath,
      moveImagePath: bossData.moveImagePath,
      dashImagePath: bossData.dashImagePath,
      deadImagePath: bossData.deadImagePath,
      skills: [...bossData.skills],
      
      // 이미지 캐시
      image: null,
      moveImage: null,
      dashImage: null,
      deadImage: null,
      
      // 사망 상태
      isDead: false,
      
      // 방향
      facingRight: true,
      
      // 보스 상태
      skillCooldown: 0,
      skillCooldownMax: 5.0,
      currentSkill: null,
      skillTimer: 0,
      
      // 흔들림 효과
      bobOffset: 0,
      bobSpeed: 4.0,
      bobAmount: 15,
      
      // 애니메이션
      currentAnimation: 'idle',
      currentFrame: 0,
      animationTimer: 0,
      useMoveImage: true,
      
      // 대쉬 상태
      isDashing: false,
      dashTimer: 0,
      dashDirectionX: 0,
      dashDirectionY: 0,
      dashWaitTimer: 0,
      isDashImageActive: false,
      
      // 다이브 상태
      isDiving: false,
      diveTimer: 0,
      diveUpDuration: 1.0,
      fadeAlpha: 1.0,
      isHidden: false,
      diveTargetX: 0,
      diveTargetY: 0,
      shakeTimer: 0,
      circleWarningTimer: 0,
      circleWarningX: 0,
      circleWarningY: 0,
      isDivingDown: false,
      diveWaitTimer: 0,
      landingShakeTimer: 0, // 착지 후 흔들림 타이머
      diveStartX: 0, // 도약 시작 위치 X
      diveStartY: 0, // 도약 시작 위치 Y
      
      // 스킬 순서 관리
      lastSkillIndex: -1,
      
      // 데미지 쿨타임
      weaponHitCooldown: 0,
      projectileHitCooldown: 0,
      contactDamageCooldown: 0,
      
      // 사운드 플래그
      playedDeathSound: false
    };
    
    this.activeBosses.push(this.currentBoss);
    
    // 이미지 로드
    this.loadBossImages(this.currentBoss);
    
    console.log(`[BossSystem] 보스 ${bossName} 스폰`);

    // 미카엘 전용 BGM 재생
    if (bossName === 'michael' && typeof playBgm === 'function') {
      playBgm('audio/Michael.mp3', 0.6);
    }

    return this.currentBoss;
  },
  
  /**
   * 보스 이미지 로드
   */
  async loadBossImages(boss) {
    const loadImage = async (path) => {
      if (!path) return null;
      
      if (ResourceLoader) {
        const cachedImg = ResourceLoader.getImage(path);
        if (cachedImg) return cachedImg;
      }
      
      return new Promise((resolve) => {
        const img = new Image();
        img.src = path;
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.warn(`[BossSystem] 이미지 로드 실패: ${path}`);
          resolve(null);
        };
      });
    };
    
    boss.image = await loadImage(boss.imagePath);
    boss.moveImage = await loadImage(boss.moveImagePath);
    boss.dashImage = await loadImage(boss.dashImagePath);
    boss.deadImage = await loadImage(boss.deadImagePath);
    
    // 대쉬 이미지가 없을 경우 이동 이미지를 대쉬 이미지로 사용
    if (!boss.dashImage && boss.moveImage) {
      boss.dashImage = boss.moveImage;
    }
  },
  
  /**
   * 보스 제거
   */
  despawn(boss) {
    const index = this.activeBosses.indexOf(boss);
    if (index > -1) {
      this.activeBosses.splice(index, 1);
    }
    
    if (this.currentBoss === boss) {
      this.currentBoss = null;
    }
  },
  
  /**
   * 업데이트
   */
  update(dt) {
    if (!this.currentBoss) return;
    
    // 말풍선 표시 중에는 일시정지
    if (SpeechBubble && SpeechBubble.isActive()) return;
    
    // 모든 활성 보스의 피격 쿨타임 감소
    for (const b of this.activeBosses) {
      if (!b) continue;
      if (b.weaponHitCooldown > 0) b.weaponHitCooldown -= dt;
      if (b.projectileHitCooldown > 0) b.projectileHitCooldown -= dt;
      if (b.contactDamageCooldown > 0) b.contactDamageCooldown -= dt;
    }
    
    const boss = this.currentBoss;
    
    // 흔들림 효과 (착지 중이 아닐 때만 위아래 움직임)
    if (boss.landingShakeTimer > 0) {
      // 착지 후 흔들림 효과 (랜덤 흔들림)
      boss.landingShakeTimer -= dt;
      boss.bobOffset = (Math.random() - 0.5) * 10;
    } else {
      // 일반 위아래 움직임
      boss.bobOffset = Math.sin(boss.bobSpeed * Date.now() / 1000) * boss.bobAmount;
    }
    
    // Quake 이펙트 업데이트
    this.updateQuakeEffects(dt);
    
    // 스킬 쿨타임 업데이트
    if (boss.skillCooldown > 0) {
      boss.skillCooldown -= dt;
    }
    
    // 플레이어 방향 계산 (낙하 후 michael 이미지 상태에서는 비활성화)
    // 낙하 후 michael 이미지 상태: useMoveImage = false, isDivingDown = false, isDiving = false
    // 착지 후 흔들림 중에도 방향전환 비활성화
    const isPostDiveMichaelImage = boss.name === 'michael' && 
                                    !boss.useMoveImage && 
                                    !boss.isDivingDown && 
                                    !boss.isDiving &&
                                    !boss.isDashImageActive;
    const isLandingShake = boss.name === 'michael' && boss.landingShakeTimer > 0;
    
    // 플레이어와의 거리 계산 (항상 계산)
    const dx = Player.x - boss.x;
    const dy = Player.y - boss.y;
    const distSq = dx * dx + dy * dy;
    
    // 방향 전환은 낙하 후 michael 이미지 상태가 아니고 착지 흔들림 중이 아닐 때만
    if (!isPostDiveMichaelImage && !isLandingShake && distSq > 0) {
      boss.facingRight = dx >= 0;
    }
    
    // 대쉬 처리
    if (boss.isDashing && boss.dashDirectionX !== undefined && boss.dashDirectionY !== undefined) {
      const dashSpeed = boss.speed * 15; // 대쉬 거리 조정
      boss.x += boss.dashDirectionX * dashSpeed * dt;
      boss.y += boss.dashDirectionY * dashSpeed * dt;
    } else if (!boss.isDiving && boss.diveWaitTimer <= 0) {
      // 일반 이동
      const isPostDiveWaiting = boss.currentSkill === 'diveAttackEnhanced' && 
                                 boss.diveTimer > 0 && 
                                 !boss.isDivingDown && 
                                 !boss.isHidden;
      if (!isPostDiveWaiting && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const dirX = dx / dist;
        const dirY = dy / dist;
        boss.x += dirX * boss.speed * dt;
        boss.y += dirY * boss.speed * dt;
      }
    }
    
    // 스킬 실행
    if (boss.skillCooldown <= 0 && boss.skills.length > 0 && !boss.currentSkill) {
      const isWaiting = boss.diveWaitTimer > 0 ||
        (boss.diveTimer > 0 && !boss.isDivingDown && !boss.isHidden);
      
      if (!boss.isDashing && !boss.isDiving && !boss.isHidden && !boss.isDivingDown && !isWaiting) {
        this.executeBossSkill(boss);
      }
    }
    
    // 스킬 타이머 업데이트
    if (boss.skillTimer > 0) {
      boss.skillTimer -= dt;
    }
    
    // 대쉬 처리
    if (boss.isDashing) {
      boss.dashTimer -= dt;
      if (boss.dashTimer <= 0) {
        boss.isDashing = false;
        boss.isDashImageActive = false;
        // 체인 소모
        boss.remainingDashes = (boss.remainingDashes || 0) - 1;
        // 다음 대쉬 대기 (체인이 남으면 짧게, 없으면 기존 대기)
        boss.dashWaitTimer = (boss.remainingDashes > 0) ? 0.2 : 1.0;
      }
    }
    
    // 대쉬 후 대기 처리
    if (boss.dashWaitTimer > 0) {
      boss.dashWaitTimer -= dt;
      if (boss.dashWaitTimer <= 0) {
        if (boss.currentSkill === 'dash' && boss.remainingDashes > 0) {
          // 다음 대쉬 시작
          this.startDash(boss);
        } else {
          this.executeSkillAttack(boss);
          boss.skillCooldown = boss.skillCooldownMax;
          boss.currentSkill = null;
        }
      }
    }
    
    // 다이브 처리 (미카엘 전용)
    // 5단계: 착지 후 대기
    if (boss.currentSkill === 'diveAttackEnhanced' && 
        boss.diveTimer > 0 && !boss.isDivingDown && !boss.isHidden && 
        boss.circleWarningTimer === 0 && boss.diveWaitTimer <= 0 &&
        (boss.circleWarningX !== 0 || boss.circleWarningY !== 0)) {
      boss.diveTimer -= dt;
      if (boss.diveTimer <= 0) {
        // 6단계: michael_move 이미지로 전환
        boss.useMoveImage = true;
        // 7단계: 스킬 종료
        boss.shakeTimer = 0;
        boss.circleWarningTimer = 0;
        boss.circleWarningX = 0;
        boss.circleWarningY = 0;
        boss.diveWaitTimer = 0;
        boss.diveTimer = 0;
        boss.isHidden = false;
        boss.isDivingDown = false;
        boss.currentSkill = null;
        boss.isDiving = false;
        boss.skillCooldown = boss.skillCooldownMax;
      }
    }
    // 1-4단계
    else if (boss.isDiving && boss.currentSkill === 'diveAttackEnhanced') {
      // 1단계: 2초 대기, 강한 흔들림
      if (boss.diveWaitTimer > 0) {
        boss.diveWaitTimer -= dt;
        if (boss.shakeTimer > 0) {
          boss.shakeTimer -= dt;
          if (Camera && GameSettings && GameSettings.screenShake) {
            Camera.shake(10, 0.2);
          }
        }
        if (boss.diveWaitTimer <= 0) {
          boss.diveTimer = boss.diveUpDuration;
          boss.fadeAlpha = 1.0;
        }
      }
      // 2단계: 위로 빠르게 이동 후 이미지 비표시
      else if (boss.diveTimer > 0 && !boss.isHidden && !boss.isDivingDown && boss.diveWaitTimer <= 0 && boss.circleWarningTimer === 0) {
        boss.diveTimer -= dt;
        boss.y -= 3000 * dt;
        boss.fadeAlpha = Math.max(0, boss.diveTimer / boss.diveUpDuration);
        if (boss.diveTimer <= 0) {
          boss.isHidden = true;
          boss.fadeAlpha = 0;
          boss.circleWarningTimer = 5.0; // 5초로 변경
          // 원표시는 도약 시작 위치부터 시작
          boss.circleWarningX = boss.diveStartX;
          boss.circleWarningY = boss.diveStartY;
          boss.diveTimer = 0;
        }
      }
      // 3단계: 5초간 원 표시 (처음 4초는 플레이어 따라가기, 마지막 1초는 고정)
      else if (boss.isHidden && boss.circleWarningTimer > 0 && !boss.isDivingDown) {
        boss.circleWarningTimer -= dt;
        
        // 처음 4.5초간은 플레이어 위치를 부드럽게 따라가기
        if (boss.circleWarningTimer > 0.5) {
          const followSpeed = 0.15; // 따라가는 속도 (0~1, 높을수록 빠름) - 더 부드럽게
          boss.circleWarningX += (Player.x - boss.circleWarningX) * followSpeed;
          boss.circleWarningY += (Player.y - boss.circleWarningY) * followSpeed;
        }
        
        // 0.5초가 지나면 낙하 시작
        if (boss.circleWarningTimer <= 0) {
          boss.isHidden = false;
          boss.isDivingDown = true;
          boss.useMoveImage = false;
          boss.fadeAlpha = 1.0;
          boss.x = boss.circleWarningX;
          boss.y = boss.circleWarningY - 200;
        }
      }
      // 4단계 계속: 빠르게 낙하
      else if (boss.isDivingDown) {
        const targetX = boss.circleWarningX;
        const targetY = boss.circleWarningY;
        const dxToTarget = targetX - boss.x;
        const dyToTarget = targetY - boss.y;
        const distToTargetSq = dxToTarget * dxToTarget + dyToTarget * dyToTarget;
        
        if (distToTargetSq < 100) { // 10 * 10
          // 착지
          boss.x = targetX;
          boss.y = targetY;
          boss.isDivingDown = false;
          boss.landingShakeTimer = 3.0; // 착지 후 3초간 흔들림
          
          if (Camera && GameSettings && GameSettings.screenShake) {
            Camera.shake(20, 0.5);
          }
          
          // Quake 이펙트 생성
          this.createQuakeEffect(targetX, targetY);
          
          this.diveAttack(boss);
          boss.diveTimer = 3.0;
          boss.useMoveImage = false;
          boss.circleWarningTimer = 0;
        } else {
          const distToTarget = Math.sqrt(distToTargetSq);
          const speed = 2000;
          boss.x += (dxToTarget / distToTarget) * speed * dt;
          boss.y += (dyToTarget / distToTarget) * speed * dt;
        }
      }
    } else if (boss.isDiving) {
      // 일반 다이브 공격
      boss.diveTimer -= dt;
      if (boss.diveTimer <= 0) {
        this.diveAttack(boss);
        boss.isDiving = false;
        boss.skillCooldown = boss.skillCooldownMax;
        boss.currentSkill = null;
      }
    }
    
    // 맵 경계 체크 (미카엘 다이브 중에는 경계 클램핑을 건너뜀)
    const skipBounds = boss.name === 'michael' && boss.currentSkill === 'diveAttackEnhanced' &&
      (boss.isDiving || boss.isDivingDown || boss.isHidden);
    if (!skipBounds) {
      const bounds = MapSystem.checkBounds(boss.x, boss.y, boss.width, boss.height);
      boss.x = bounds.x;
      boss.y = bounds.y;
    }
    
    // 그리드에 등록
    if (CollisionSystem) {
      CollisionSystem.registerObject(boss, 'boss');
    }
  },
  
  /**
   * 보스 스킬 실행
   */
  executeBossSkill(boss) {
    if (boss.skills.length === 0) return;
    
    // 스킬을 랜덤으로 사용
    let skillIndex;
    if (boss.skills.length === 1) {
      skillIndex = 0;
    } else {
      do {
        skillIndex = Math.floor(Math.random() * boss.skills.length);
      } while (skillIndex === boss.lastSkillIndex && boss.skills.length > 1);
    }
    boss.lastSkillIndex = skillIndex;
    boss.currentSkill = boss.skills[skillIndex];
    boss.skillTimer = 0;
    
    // 스킬별 처리
    switch (boss.currentSkill) {
      case 'dash':
        // 1~3회 연속 대쉬
        boss.remainingDashes = Math.floor(Math.random() * 3) + 1;
        this.startDash(boss);
        break;
        
      case 'diveAttackEnhanced':
        boss.isDiving = true;
        boss.diveWaitTimer = 2.0;
        boss.shakeTimer = 2.0;
        boss.diveTimer = 0;
        boss.isHidden = false;
        boss.isDivingDown = false;
        boss.useMoveImage = true;
        boss.fadeAlpha = 1.0;
        boss.circleWarningTimer = 0;
        boss.circleWarningX = 0;
        boss.circleWarningY = 0;
        // 도약 시작 위치 저장
        boss.diveStartX = boss.x;
        boss.diveStartY = boss.y;
        break;
    }
  },

  /**
   * 단일 대쉬 시작 (체인 지원)
   */
  startDash(boss) {
    boss.isDashing = true;
    boss.dashTimer = 0.9;
    boss.useMoveImage = true;
    boss.isDashImageActive = true;
    const dx1 = Player.x - boss.x;
    const dy1 = Player.y - boss.y;
    const dist1Sq = dx1 * dx1 + dy1 * dy1;
    if (dist1Sq > 0) {
      const dist1 = Math.sqrt(dist1Sq);
      boss.dashDirectionX = dx1 / dist1;
      boss.dashDirectionY = dy1 / dist1;
    } else {
      boss.dashDirectionX = 1;
      boss.dashDirectionY = 0;
    }
  },
  
  /**
   * 스킬 공격 실행
   */
  executeSkillAttack(boss) {
    if (!boss.currentSkill) return;
    
    switch (boss.currentSkill) {
      case 'dash':
        boss.skillCooldown = boss.skillCooldownMax;
        boss.currentSkill = null;
        break;
        
      case 'diveAttackEnhanced':
        // 이미 update에서 처리됨
        break;
    }
  },
  
  /**
   * 떨어지며 범위 공격 (미카엘)
   */
  diveAttack(boss) {
    // 스킬2(diveAttackEnhanced)의 원 표시 반지름과 정확히 일치시킴
    const radius = boss.currentSkill === 'diveAttackEnhanced' ? this.CIRCLE_WARNING_RADIUS : 200;
    const projectileCount = 16;
    
    const targetX = boss.currentSkill === 'diveAttackEnhanced' ? boss.circleWarningX : Player.x;
    const targetY = boss.currentSkill === 'diveAttackEnhanced' ? boss.circleWarningY : Player.y;
    
    for (let i = 0; i < projectileCount; i++) {
      const angle = (Math.PI * 2 / projectileCount) * i;
      Projectile.spawn(
        targetX, targetY, angle,
        300, boss.damage, 'enemy'
      );
    }
    
    // 범위 내 플레이어에게 데미지 (원 표시 안에만 적용)
    const dx = Player.x - targetX;
    const dy = Player.y - targetY;
    const distSq = dx * dx + dy * dy;
    const radiusSq = radius * radius;
    // 정확히 원 표시 반지름 내에만 데미지 적용
    if (distSq <= radiusSq && !Player.isInvincible) {
      const isDead = Player.takeDamage(boss.damage * 2);
      if (isDead && handleGameOver) {
        handleGameOver('플레이어가 사망했습니다.');
      }
    }
    
    if (boss.currentSkill !== 'diveAttackEnhanced') {
      boss.isDiving = false;
    }
  },
  
  /**
   * 렌더링
   */
  render(ctx) {
    if (!this.currentBoss) return;
    
    const boss = this.currentBoss;
    
    // 흔들림 효과
    let shakeOffset = 0;
    if (boss.name === 'michael' && boss.currentSkill === 'diveAttackEnhanced' && boss.shakeTimer > 0) {
      shakeOffset = (Math.random() - 0.5) * 10;
    }
    let renderX = boss.x;
    let renderY = boss.y + boss.bobOffset + shakeOffset;
    
    // 이미지 선택
    let currentImage = boss.moveImage;
    
    if (boss.isHidden) {
      currentImage = null;
    } else if (boss.isDead && boss.deadImage) {
      // 사망 시 사망 이미지 사용
      currentImage = boss.deadImage;
    } else if (boss.name === 'michael') {
      if (boss.isDashImageActive && boss.dashImage) {
        currentImage = boss.dashImage;
      } else if (boss.useMoveImage) {
        currentImage = boss.moveImage;
      } else {
        currentImage = boss.image;
      }
    }
    
    // 렌더링 크기
    let renderWidth = boss.width;
    let renderHeight = boss.height;
    if (boss.name === 'michael' && currentImage === boss.image) {
      renderWidth = boss.width * 0.95;
      renderHeight = boss.height * 0.95;
    }
    
    // 그림자 렌더링 (보스 이미지보다 먼저 그리기) - move, dash, dead 상태 모두 적용
    if (!boss.isHidden && (boss.isDead || boss.name === 'michael')) {
      ctx.save();
      const shadowY = renderY + renderHeight / 2; // 발 밑 0px 위치
      const shadowWidth = renderWidth * 0.4; // 렌더링 크기의 40%
      const shadowHeight = shadowWidth * 0.4; // 타원형 (가로가 더 긴 타원)
      
      // 그라데이션 그림자 (중앙이 진하고 가장자리가 투명)
      const shadowGradient = ctx.createRadialGradient(
        renderX, shadowY,
        0,
        renderX, shadowY,
        shadowWidth / 2
      );
      shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
      shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = shadowGradient;
      ctx.beginPath();
      ctx.ellipse(renderX, shadowY, shadowWidth / 2, shadowHeight / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // 이미지 렌더링
    if (currentImage && currentImage.complete && currentImage.naturalWidth > 0) {
      if (!this.offscreenCanvas || !this.offscreenCtx) {
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      }
      
      const offscreenCtx = this.offscreenCtx;
      const offscreenCanvas = this.offscreenCanvas;
      
      const requiredWidth = Math.max(renderWidth + 40, 200);
      const requiredHeight = Math.max(renderHeight + 40, 200);
      if (offscreenCanvas.width < requiredWidth || offscreenCanvas.height < requiredHeight) {
        offscreenCanvas.width = requiredWidth;
        offscreenCanvas.height = requiredHeight;
      }
      
      offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      offscreenCtx.save();
      offscreenCtx.translate(offscreenCanvas.width / 2, offscreenCanvas.height / 2);
      
      // 이미지 원본 비율 계산
      const imgAspect = currentImage.naturalWidth / currentImage.naturalHeight;
      const targetAspect = renderWidth / renderHeight;
      
      let drawWidth = renderWidth;
      let drawHeight = renderHeight;
      let drawX = -renderWidth / 2;
      let drawY = -renderHeight / 2;
      
      if (imgAspect > targetAspect) {
        drawHeight = renderHeight;
        drawWidth = renderHeight * imgAspect;
        drawX = -drawWidth / 2;
        drawY = -renderHeight / 2;
      } else {
        drawWidth = renderWidth;
        drawHeight = renderWidth / imgAspect;
        drawX = -renderWidth / 2;
        drawY = -drawHeight / 2;
      }
      
      offscreenCtx.globalAlpha = 1.0;
      offscreenCtx.globalCompositeOperation = 'source-over';
      offscreenCtx.drawImage(currentImage, drawX, drawY, drawWidth, drawHeight);
      
      // 알파 채널 마스크
      offscreenCtx.globalCompositeOperation = 'destination-in';
      offscreenCtx.globalAlpha = 1.0;
      offscreenCtx.drawImage(currentImage, drawX, drawY, drawWidth, drawHeight);
      
      offscreenCtx.restore();
      
      // 메인 캔버스에 렌더링
      ctx.save();
      ctx.translate(renderX, renderY);
      
      // 상승 페이드 적용
      if (boss.name === 'michael' && boss.currentSkill === 'diveAttackEnhanced' && 
          boss.fadeAlpha !== undefined && boss.diveTimer > 0 && !boss.isDivingDown && !boss.isHidden) {
        ctx.globalAlpha *= boss.fadeAlpha;
      }
      
      if (!boss.facingRight) {
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(
        offscreenCanvas,
        -renderWidth / 2,
        -renderHeight / 2,
        renderWidth,
        renderHeight
      );
      
      ctx.restore();
    } else if (!boss.isHidden) {
      // 이미지가 없을 경우 색상 사각형
      ctx.save();
      ctx.translate(boss.x, renderY);
      
      if (!boss.facingRight) {
        ctx.scale(-1, 1);
      }
      
      ctx.fillStyle = boss.color;
      ctx.fillRect(-renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);
      ctx.restore();
    }
    
    // 원 경고 표시 (Target 이미지 사용)
    // 데미지 범위와 정확히 일치시키기 위해 상수 사용
    if (boss.name === 'michael' && boss.currentSkill === 'diveAttackEnhanced' && boss.circleWarningTimer > 0) {
      if (this.targetImage && this.targetImage.complete) {
        ctx.save();
        ctx.translate(boss.circleWarningX, boss.circleWarningY);
        const targetSize = this.CIRCLE_WARNING_RADIUS * 2; // 원 크기 (반지름 * 2)
        ctx.drawImage(this.targetImage, -targetSize / 2, -targetSize / 2, targetSize, targetSize);
        ctx.restore();
      } else {
        // 이미지가 로드되지 않았을 경우 기존 원 표시
        ctx.save();
        ctx.translate(boss.circleWarningX, boss.circleWarningY);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, this.CIRCLE_WARNING_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  },
};
