/**
 * Enemy.js - 적 시스템 모듈
 * 오브젝트 풀링을 사용한 최적화된 적 관리
 */

const Enemy = {
  // 오브젝트 풀
  pool: [],
  poolSize: 300, // 풀 크기
  activeEnemies: [],
  
  // 이미지 캐시 (같은 타입의 적은 같은 이미지 재사용)
  imageCache: {},
  
  // 적 타입 정의 (천사/악마)
  types: {
    // 천사 (Angel)
    malakh: {
      name: '말라크',
      category: 'angel',
      baseHp: 50,
      baseDamage: 5,
      baseSpeed: 150, // 이동 속도 (빠르게)
      baseGold: 2,
      exp: 5,
      width: 100, // 충돌 판정 크기
      height: 100, // 충돌 판정 크기
      renderSize: 230, // 렌더링 크기(정사각)
      color: '#ffffff',
      attackRange: 40,
      attackCooldown: 1.5,
      imagePath: 'images/enemy/malakh/malakh',
      spritePath: 'images/enemy/malakh/',
      spriteFrameCount: 4,
      frameDuration: 0.25
    },
    power: {
      name: '파워',
      category: 'angel',
      baseHp: 80,
      baseDamage: 7,
      baseSpeed: 180, // 이동 속도 (빠르게)
      baseGold: 3,
      exp: 7,
      width: 100, // 충돌 판정 크기
      height: 100, // 충돌 판정 크기
      renderSize: 240, // 렌더링 크기(정사각)
      color: '#ffff99',
      attackRange: 40,
      attackCooldown: 1.5,
      chargeCooldown: 3.0, // 돌진 쿨타임
      chargeSpeed: 1000, // 돌진 속도
      chargeDuration: 0.8, // 돌진 지속 시간
      imagePath: 'images/enemy/power/power',
      spritePath: 'images/enemy/power/',
      spriteFrameCount: 4,
      frameDuration: 0.25
    },
    dominion: {
      name: '도미니온',
      category: 'angel',
      baseHp: 120,
      baseDamage: 8,
      baseSpeed: 150, // 이동 속도 (빠르게)
      baseGold: 4,
      exp: 10,
      width: 130, // 충돌 판정 크기
      height: 130, // 충돌 판정 크기
      renderSize: 280, // 렌더링 크기(정사각)
      color: '#ffccff',
      attackRange: 50,
      attackCooldown: 1.5,
      imagePath: 'images/enemy/dominion/dominion',
      spritePath: 'images/enemy/dominion/',
      spriteFrameCount: 4,
      frameDuration: 0.25,
      scale: 1.5
    },
  },
  
  // 오프스크린 캔버스 (이미지 여백 제거 및 틴트 효과용)
  offscreenCanvas: null,
  offscreenCtx: null,
  
  /**
   * 초기화
   */
  init() {
    this.pool = [];
    this.activeEnemies = [];
    
    // 오브젝트 풀 생성
    for (let i = 0; i < this.poolSize; i++) {
      this.pool.push(this.createEnemy());
    }
    
    // 오프스크린 캔버스 생성 (이미지 여백 제거 및 틴트 효과용)
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 200; // 충분한 크기
    this.offscreenCanvas.height = 200;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
  },
  
  /**
   * 적 객체 생성
   */
  createEnemy() {
    return {
      x: 0,
      y: 0,
      type: 'malakh',
      category: 'angel',
      hp: 0,
      maxHp: 0,
      speed: 0,
      damage: 0,
      exp: 0,
      gold: 0,
      width: 32,
      height: 32,
      color: '#ffffff',
      active: false,
      isDead: false,
      attackTimer: 0,
      attackCooldown: 0,
      attackRange: 0,
      directionX: 0,
      directionY: 0,
      
      // 애니메이션
      currentAnimation: 'idle',
      currentFrame: 0,
      animationTimer: 0,
      frameDuration: 0.1,
      sprites: {},
      
      // 틴트 효과
      tintTimer: 0,
      isTinted: false,
      // 피격 흔들림
      hitShakeTimer: 0,
      hitShakeDuration: 0.25,
      hitShakeIntensity: 14,
      
      // 흔들림 효과
      bobOffset: 0, // 위아래 흔들림 오프셋
      bobSpeed: 4.0, // 흔들림 속도 (더 빠른 주기)
      bobAmount: 5, // 흔들림 크기 (더 강한 흔들림)
      
      // 돌진 (Power 타입)
      isCharging: false,
      chargeTimer: 0,
      chargeCooldown: 0,
      chargeDirectionX: 0,
      chargeDirectionY: 0,
      
      // 웨이브별 스케일
      wave: 1,
      
      // 방향 (이미지 반전용)
      facingRight: true, // 오른쪽을 바라보는지 여부
      
      // 접촉 데미지 쿨타임
      contactDamageCooldown: 0, // 플레이어 접촉 데미지 쿨타임
      
      // HP 게이지바 표시
      hpBarTimer: 0, // HP 게이지바 표시 시간 (초)
      showHpBar: false // HP 게이지바 표시 여부
    };
  },
  
  /**
   * 적 스폰 (웨이브별 스케일 적용)
   */
  spawnEnemy(type, x, y, wave) {
    // 풀에서 비활성 적 찾기
    let enemy = this.pool.find(e => !e.active);
    
    // 풀이 부족하면 새로 생성
    if (!enemy) {
      enemy = this.createEnemy();
      this.pool.push(enemy);
    }
    
    // 적 타입 데이터 가져오기
    const typeData = this.types[type] || this.types.malakh;
    
    // 웨이브별 스케일 계산
    const hpScale = 1 + (wave - 1) * 0.1; // 웨이브당 10% 증가
    const damageScale = 1 + (wave - 1) * 0.1;
    
    // 적 초기화
    enemy.x = x;
    enemy.y = y;
    enemy.type = type;
    enemy.category = typeData.category;
    enemy.hp = typeData.baseHp * hpScale;
    enemy.maxHp = enemy.hp;
    enemy.speed = typeData.baseSpeed;
    enemy.damage = typeData.baseDamage * damageScale;
    enemy.exp = typeData.exp;
    enemy.gold = typeData.baseGold;
    enemy.width = typeData.width;
    enemy.height = typeData.height;
    // 렌더 크기는 renderSize(정사각)로 통일
    enemy.renderSize = typeData.renderSize || typeData.width;
    enemy.renderWidth = enemy.renderSize;
    enemy.renderHeight = enemy.renderSize;
    enemy.color = typeData.color;
    enemy.frameDuration = typeData.frameDuration || 0.1;
    enemy.attackRange = typeData.attackRange;
    enemy.attackCooldown = typeData.attackCooldown;
    enemy.attackTimer = 0;
    enemy.active = true;
    enemy.isDead = false;
    enemy.directionX = 0;
    enemy.directionY = 0;
    enemy.wave = wave;
    
    // 애니메이션 초기화
    enemy.currentAnimation = 'idle';
    enemy.currentFrame = 0;
    enemy.animationTimer = 0;
    enemy.sprites = {};
    
    // 틴트 효과 초기화
    enemy.tintTimer = 0;
    enemy.isTinted = false;
    enemy.hitShakeTimer = 0;
    
    // 흔들림 초기화
    enemy.bobOffset = 0;
    
    // 접촉 데미지 쿨타임 초기화
    enemy.contactDamageCooldown = 0;
    
    // HP 게이지바 초기화
    enemy.hpBarTimer = 0;
    enemy.showHpBar = false;
    
    // 돌진 초기화 (Power 타입)
    if (type === 'power') {
      enemy.chargeCooldown = typeData.chargeCooldown || 3.0;
      enemy.chargeDuration = typeData.chargeDuration || 1.5; // 돌진 지속 시간
      enemy.chargeTimer = enemy.chargeCooldown;
      enemy.isCharging = false;
    }
    
    // 스프라이트 로드 (비동기)
    this.loadEnemySprites(enemy, typeData);
    
    if (!this.activeEnemies.includes(enemy)) {
      this.activeEnemies.push(enemy);
    }
    
    return enemy;
  },
  
  /**
   * 적 스프라이트 로드 (스프라이트 시트 또는 단일 이미지)
   */
  async loadEnemySprites(enemy, typeData) {
    const imagePath = typeData.imagePath;
    const spriteBase = typeData.spritePath; // 예: images/enemy/malakh/
    const maxFrames = typeData.spriteFrameCount || 12; // 최대 시도 프레임 수
    
    // 1) 번호가 붙은 스프라이트 프레임 시도 (spriteFrameCount가 0보다 클 때만)
    let loadedFrames = [];
    if (spriteBase && maxFrames > 0) {
      for (let i = 0; i < maxFrames; i++) {
        const framePath = `${spriteBase}frame_${String(i).padStart(3, '0')}.png`;
        
        // ResourceLoader 캐시 우선 사용
        let frameImg = ResourceLoader ? ResourceLoader.getImage(framePath) : null;
        
        if (!frameImg) {
          frameImg = new Image();
          frameImg.src = framePath;
          const ok = await new Promise((resolve) => {
            frameImg.onload = () => resolve(true);
            frameImg.onerror = () => resolve(false);
          });
          if (!ok) {
            // 한 프레임이라도 로드된 후 실패하면 종료
            if (loadedFrames.length > 0) break;
            continue;
          }
        }
        
        loadedFrames.push(frameImg);
      }
    }
    
    if (loadedFrames.length > 0) {
      enemy.sprites.idle = loadedFrames;
      enemy.currentFrame = 0;
      enemy.animationTimer = 0;
      
      // 캐시에 저장 (기본 스프라이트는 첫 프레임)
      if (!this.imageCache) this.imageCache = {};
      this.imageCache[imagePath] = loadedFrames[0];
      enemy.sprite = loadedFrames[0];
      return;
    }
    
    // 2) 스프라이트 프레임이 없으면 단일 이미지 로드
    const fullPath = `${imagePath}.png`;
    
    // ResourceLoader에서 이미 로드된 이미지 확인
    if (ResourceLoader) {
      const cachedImg = ResourceLoader.getImage(fullPath);
      if (cachedImg) {
        enemy.sprite = cachedImg;
        if (!enemy.sprites.idle) enemy.sprites.idle = [];
        enemy.sprites.idle[0] = cachedImg;
        // 캐시에도 저장
        if (!this.imageCache) {
          this.imageCache = {};
        }
        this.imageCache[imagePath] = cachedImg;
        return;
      }
    }
    
    // 이미지가 이미 로드되어 있으면 재사용
    if (this.imageCache && this.imageCache[imagePath]) {
      enemy.sprite = this.imageCache[imagePath];
      if (!enemy.sprites.idle) enemy.sprites.idle = [];
      enemy.sprites.idle[0] = enemy.sprite;
      return;
    }
    
    // 이미지 캐시 초기화
    if (!this.imageCache) {
      this.imageCache = {};
    }
    
    // 단일 이미지 파일 로드
    const img = new Image();
    img.src = fullPath;
    
    await new Promise((resolve) => {
      img.onload = () => {
        enemy.sprite = img;
        if (!enemy.sprites.idle) enemy.sprites.idle = [];
        enemy.sprites.idle[0] = img;
        this.imageCache[imagePath] = img;
        resolve();
      };
      img.onerror = () => {
        // 이미지 로드 실패 시 기본 색상 사각형 사용
        enemy.sprite = null;
        console.warn(`[Enemy] 이미지 로드 실패: ${fullPath}`);
        resolve();
      };
    });
  },
  
  /**
   * 적 제거 (풀에 반환)
   */
  despawn(enemy) {
    enemy.active = false;
    enemy.isDead = true;
    const index = this.activeEnemies.indexOf(enemy);
    if (index > -1) {
      this.activeEnemies.splice(index, 1);
    }
  },
  
  /**
   * 업데이트
   */
  update(dt) {
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];
      
      if (!enemy.active || enemy.isDead) continue;
      
      // 흔들림 효과 업데이트
      enemy.bobOffset = Math.sin(enemy.bobSpeed * Date.now() / 1000) * enemy.bobAmount;
      
      // 틴트 효과 업데이트
      if (enemy.isTinted) {
        enemy.tintTimer -= dt;
        if (enemy.tintTimer <= 0) {
          enemy.isTinted = false;
        }
      }
      
      // 피격 흔들림 감쇠
      if (enemy.hitShakeTimer > 0) {
        enemy.hitShakeTimer = Math.max(0, enemy.hitShakeTimer - dt);
      }
      
      // 특수 공격 전 틴트 효과 (파워의 돌진 등)
      // 일반 충돌 데미지는 틴트 효과 없음
      if (enemy.type === 'power' && !enemy.isCharging && enemy.chargeTimer <= 0.5 && enemy.chargeTimer > 0) {
        // 돌진 준비 중 틴트 효과
        enemy.isTinted = true;
        enemy.tintTimer = 0.5;
      }
      
      // 플레이어 방향 계산 (Math.sqrt 최적화)
      const dx = Player.x - enemy.x;
      const dy = Player.y - enemy.y;
      const distSq = dx * dx + dy * dy;
      
      // 거리 계산 (외부에서도 사용하므로 먼저 계산)
      let dist = 0;
      if (distSq > 0) {
        dist = Math.sqrt(distSq);
        enemy.directionX = dx / dist;
        enemy.directionY = dy / dist;
        
        // 이미지 방향 설정 (플레이어가 오른쪽에 있으면 오른쪽, 왼쪽에 있으면 왼쪽)
        enemy.facingRight = dx >= 0;
      }
      
      // 공격 타이머 업데이트
      if (enemy.attackTimer > 0) {
        enemy.attackTimer -= dt;
      }
      
      // 접촉 데미지 쿨타임 업데이트
      if (enemy.contactDamageCooldown > 0) {
        enemy.contactDamageCooldown -= dt;
      }
      
      // HP 게이지바 사용 안 함
      enemy.showHpBar = false;
      
      // Power 타입: 돌진 처리
      if (enemy.type === 'power') {
        enemy.chargeTimer -= dt;
        
        if (!enemy.isCharging && enemy.chargeTimer <= 0 && dist > enemy.attackRange) {
          // 돌진 시작 (스킬 사용) - 접촉 데미지 쿨타임 초기화
          enemy.isCharging = true;
          enemy.chargeDirectionX = enemy.directionX;
          enemy.chargeDirectionY = enemy.directionY;
          const typeData = this.types[enemy.type];
          enemy.chargeTimer = enemy.chargeDuration || typeData.chargeDuration || 1.5;
          enemy.contactDamageCooldown = 0; // 스킬 사용 시 쿨타임 초기화
        }
        
        if (enemy.isCharging) {
          enemy.chargeTimer -= dt;
          const typeData = this.types[enemy.type];
          const chargeSpeed = typeData.chargeSpeed || 1000;
          enemy.x += enemy.chargeDirectionX * chargeSpeed * dt;
          enemy.y += enemy.chargeDirectionY * chargeSpeed * dt;
          
          if (enemy.chargeTimer <= 0) {
            enemy.isCharging = false;
            enemy.chargeTimer = typeData.chargeCooldown || 3.0;
          }
        } else {
          // 일반 이동
          if (dist > enemy.attackRange) {
            enemy.x += enemy.directionX * enemy.speed * dt;
            enemy.y += enemy.directionY * enemy.speed * dt;
          }
        }
      } else {
        // 일반 적: 플레이어에게 접근
        if (dist > enemy.attackRange) {
          enemy.x += enemy.directionX * enemy.speed * dt;
          enemy.y += enemy.directionY * enemy.speed * dt;
        } else if (enemy.attackTimer <= 0) {
          // 공격
          enemy.attackTimer = enemy.attackCooldown;
          // 플레이어에게 데미지 (충돌 시스템에서 처리)
        }
      }
      
      // 적들은 경계를 넘을 수 있음 (경계 체크 제거)
      
      // 애니메이션 업데이트
      const frames = enemy.sprites.idle || [];
      if (frames.length > 1) {
        enemy.animationTimer += dt;
        if (enemy.animationTimer >= enemy.frameDuration) {
          enemy.animationTimer = 0;
          enemy.currentFrame = (enemy.currentFrame + 1) % frames.length;
        }
      } else {
        enemy.currentFrame = 0;
      }
      
      // 그리드에 등록
      CollisionSystem.registerObject(enemy, 'enemy');
    }
  },
  
  /**
   * 렌더링 (이미지 여백 제거 및 틴트 효과 적용)
   */
  render(ctx) {
    for (const enemy of this.activeEnemies) {
      if (!enemy.active || enemy.isDead) continue;
      
      const renderY = enemy.y + enemy.bobOffset; // 기본 흔들림 적용
      
      // 피격 흔들림 오프셋
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (enemy.hitShakeTimer > 0) {
        const t = enemy.hitShakeTimer / enemy.hitShakeDuration;
        const mag = enemy.hitShakeIntensity * t;
        shakeOffsetX = (Math.random() * 2 - 1) * mag;
        shakeOffsetY = (Math.random() * 2 - 1) * mag;
      }
      
      // 렌더링 크기 계산
      const renderWidth = enemy.renderWidth || enemy.width;
      const renderHeight = enemy.renderHeight || enemy.height;
      
      // 그림자 렌더링 (적 이미지보다 먼저 그리기)
      ctx.save();
      const shadowY = enemy.y + renderHeight / 2; // 발 밑 0px 위치
      const shadowWidth = renderWidth * 0.4; // 적 크기의 40%
      const shadowHeight = shadowWidth * 0.4; // 타원형 (가로가 더 긴 타원)
      
      // 그라데이션 그림자 (중앙이 진하고 가장자리가 투명)
      const shadowGradient = ctx.createRadialGradient(
        enemy.x, shadowY,
        0,
        enemy.x, shadowY,
        shadowWidth / 2
      );
      shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
      shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = shadowGradient;
      ctx.beginPath();
      ctx.ellipse(enemy.x, shadowY, shadowWidth / 2, shadowHeight / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // 이미지가 있으면 이미지 렌더링 (여백 제거 및 틴트 적용)
      const spriteFrames = enemy.sprites.idle || [];
      const sprite = spriteFrames[enemy.currentFrame] || enemy.sprite;
      
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const offscreenCtx = this.offscreenCtx;
        const offscreenCanvas = this.offscreenCanvas;
        
        // 오프스크린 캔버스 크기를 렌더링 크기에 맞춤
        if (offscreenCanvas.width < renderWidth || offscreenCanvas.height < renderHeight) {
          offscreenCanvas.width = Math.max(offscreenCanvas.width, renderWidth + 20);
          offscreenCanvas.height = Math.max(offscreenCanvas.height, renderHeight + 20);
        }
        
        // 오프스크린 캔버스 초기화
        offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        
        // 오프스크린 캔버스 중앙으로 이동
        offscreenCtx.save();
        offscreenCtx.translate(offscreenCanvas.width / 2, offscreenCanvas.height / 2);
        
        // 1. 원본 스프라이트를 렌더링 크기로 그리기
        offscreenCtx.globalAlpha = 1.0;
        offscreenCtx.globalCompositeOperation = 'source-over';
        offscreenCtx.drawImage(
          sprite,
          -renderWidth / 2,
          -renderHeight / 2,
          renderWidth,
          renderHeight
        );
        
        // 틴트 효과 적용 (빨간색 틴트)
        if (enemy.isTinted) {
          // 2. 스프라이트의 알파 채널을 마스크로 사용 (투명한 여백 제거)
          offscreenCtx.globalCompositeOperation = 'destination-in';
          offscreenCtx.globalAlpha = 1.0;
          offscreenCtx.drawImage(
            sprite,
            -renderWidth / 2,
            -renderHeight / 2,
            renderWidth,
            renderHeight
          );
          
          // 3. 마스크된 영역에만 빨간색 틴트 적용
          offscreenCtx.globalCompositeOperation = 'source-atop';
          offscreenCtx.globalAlpha = 0.5;
          offscreenCtx.fillStyle = '#ff0000';
          offscreenCtx.fillRect(
            -renderWidth / 2,
            -renderHeight / 2,
            renderWidth,
            renderHeight
          );
          
          // 4. multiply 모드로 빨간색 틴트 효과 강화
          offscreenCtx.globalCompositeOperation = 'multiply';
          offscreenCtx.globalAlpha = 0.3;
          offscreenCtx.drawImage(
            enemy.sprite,
            -renderWidth / 2,
            -renderHeight / 2,
            renderWidth,
            renderHeight
          );
        }
        
        offscreenCtx.restore();
        
        // 메인 캔버스에 오프스크린 캔버스 결과물 그리기 (고정 렌더링 크기 사용)
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.translate(enemy.x + shakeOffsetX, renderY + shakeOffsetY);
        
        // 왼쪽을 바라볼 때 가로 뒤집기 (플레이어처럼)
        if (!enemy.facingRight) {
          ctx.scale(-1, 1);
        }
        
        // 고정 렌더링 크기로 그리기
        ctx.drawImage(
          offscreenCanvas,
          -renderWidth / 2,
          -renderHeight / 2,
          renderWidth,
          renderHeight
        );
        ctx.restore();
      } else {
        // 이미지가 없으면 색상 사각형으로 대체
        ctx.save();
        ctx.fillStyle = enemy.color;
        
        // 틴트 효과
        if (enemy.isTinted) {
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = '#ff0000';
          ctx.globalAlpha = 0.5;
        }
        
        ctx.fillRect(
          enemy.x - enemy.width / 2 + shakeOffsetX,
          renderY - enemy.height / 2 + shakeOffsetY,
          enemy.width,
          enemy.height
        );
        ctx.restore();
      }
    }
  }
};
