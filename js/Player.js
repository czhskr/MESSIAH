/**
 * Player.js - 플레이어 시스템 모듈
 * 플레이어 이동, 애니메이션, 공격을 관리합니다.
 */

const Player = {
  // 플레이어 위치 및 상태
  x: 0,
  y: 0,
  width: 96, // 크기 증가 (32 -> 48)
  height: 96, // 크기 증가 (32 -> 48)
  
  // 이동 방향 (마지막 이동 방향 저장)
  facingRight: true,
  
  // 스프라이트 애니메이션
  sprites: {
    idle: [],
    running: [],
    'falling-back-death': [],
    'getting-up': [],
    'character': [] // 클리어 시퀀스용 캐릭터 스프라이트
  },
  
  // 현재 애니메이션 상태
  currentAnimation: 'idle',
  currentFrame: 0,
  animationTimer: 0,
  frameDuration: 0.1, // 프레임당 시간
  
  // 사망 및 부활 상태
  isDead: false,
  isDying: false, // 사망 애니메이션 재생 중
  isReviving: false, // 부활 애니메이션 재생 중
  deathAnimationTimer: 0,
  reviveAnimationTimer: 0,
  reviveCount: 0, // 부활 횟수 (추후 능력으로 증가 가능)
  deathAnimationDuration: 0, // 사망 애니메이션 총 시간
  reviveAnimationDuration: 0, // 부활 애니메이션 총 시간
  deathAnimationFrameTime: 0.5, // 사망 애니메이션 프레임 시간 (느리게 재생)
  reviveAnimationFrameTime: 0.1, // 부활 애니메이션 프레임 시간
  deathWaitTimer: 0, // 사망 애니메이션 완료 후 대기 타이머
  deathWaitDuration: 5.0, // 사망 애니메이션 완료 후 대기 시간 (5초, 부활 시에는 3초)
  reviveWaitDuration: 3.0, // 부활 시 대기 시간 (3초)
  cameraZoom: 1.0, // 카메라 줌 (사망 시 확대)
  showJudgedText: false, // "JUDGED" 텍스트 표시 여부
  judgedTextAnimationTimer: 0, // "JUDGED" 텍스트 애니메이션 타이머
  judgedTextAnimationDuration: 0.15, // "JUDGED" 텍스트 애니메이션 지속 시간 (도장 찍는 효과 - 더 빠르게)
  showQuestionMark: false, // "...?" 텍스트 표시 여부 (부활 시)
  questionMarkText: '', // 타이핑 효과를 위한 텍스트
  questionMarkTimer: 0, // 타이핑 효과 타이머
  questionMarkTypingSpeed: 0.05, // 타이핑 속도 (초당)
  reviveWaitTimer: 0, // 타이핑 완료 후 부활 애니메이션까지 대기 타이머
  reviveWaitDuration: 2.0, // 타이핑 완료 후 대기 시간 (2초)
  postReviveInvincibleTimer: 0, // 부활 후 무적 타이머
  postReviveInvincibleDuration: 3.0, // 부활 후 무적 지속 시간 (3초)
  
  // 클리어 시퀀스 상태
  isClearing: false, // 클리어 시퀀스 진행 중
  clearSequenceTimer: 0, // 클리어 시퀀스 타이머
  clearSequenceDuration: 10.0, // 클리어 시퀀스 지속 시간 (10초)
  clearCameraFollowDuration: 3.0, // 카메라가 보스를 따라가는 시간 (3초)
  clearCenterDuration: 1.0, // 보스가 중앙에 도달한 후 유지 시간 (1초)
  clearZoomDuration: 1.0, // 줌인 지속 시간 (1초)
  clearHuntedDuration: 5.0, // HUNTED 텍스트 표시 후 대기 시간 (5초)
  clearZoom: 1.0, // 클리어 시퀀스 줌
  showHuntedText: false, // "HUNTED" 텍스트 표시 여부
  huntedTextAnimationTimer: 0, // "HUNTED" 텍스트 애니메이션 타이머
  huntedTextAnimationDuration: 0.15, // "HUNTED" 텍스트 애니메이션 지속 시간
  clearPhase: 0, // 클리어 시퀀스 현재 단계 (0: 카메라 따라가기, 1: 중앙 도달, 2: 줌인, 3: HUNTED 표시)
  clearCameraReached: false, // 카메라가 보스에 도달했는지 여부
  clearBossCentered: false, // 보스가 중앙에 도달했는지 여부
  clearZoomComplete: false, // 줌인이 완료되었는지 여부
  
  // 회피 상태
  dashSpeed: 750, // 회피 시 이동 속도 - 증가
  dashDuration: 0.25, // 회피 지속 시간
  dashTimer: 0,
  dashDirectionX: 0, // 회피 방향 X
  dashDirectionY: 0, // 회피 방향 Y
  isInvincible: false, // 무적 상태
  
  // 자동 공격
  attackTimer: 0, // 공격 타이머
  
  // 잔상 효과
  afterimages: [], // 잔상 배열
  afterimageInterval: 0.05, // 잔상 생성 간격
  afterimageTimer: 0, // 잔상 생성 타이머
  afterimageLifetime: 0.3, // 잔상 지속 시간
  afterimageCanvas: null, // 잔상 렌더링용 오프스크린 캔버스
  afterimageCtx: null,
  
  /**
   * 초기화
   */
  async init() {
    // 플레이어 초기 위치 (맵 중앙)
    this.x = MapSystem.playableAreaSize / 2;
    this.y = MapSystem.playableAreaSize / 2;
    
    // 스프라이트 로드
    await this.loadSprites();
    
    // 초기 애니메이션 설정
    this.currentAnimation = 'idle';
    this.currentFrame = 0;
    this.animationTimer = 0;
    
    // 사망/부활 상태 초기화
    this.isDead = false;
    this.isDying = false;
    this.isReviving = false;
    this.deathAnimationTimer = 0;
    this.deathWaitTimer = 0;
    this.reviveAnimationTimer = 0;
    this.showJudgedText = false;
    this.judgedTextAnimationTimer = 0;
    this.showQuestionMark = false;
    this.questionMarkText = '';
    this.questionMarkTimer = 0;
    this.reviveWaitTimer = 0;
    this.postReviveInvincibleTimer = 0;
    this.isClearing = false;
    this.clearSequenceTimer = 0;
    this.clearZoom = 1.0;
    this.showHuntedText = false;
    this.huntedTextAnimationTimer = 0;
    this.clearPhase = 0;
    this.clearCameraReached = false;
    this.clearBossCentered = false;
    this.clearZoomComplete = false;
    this.reviveCount = 0; // 기본 부활 횟수 0
    this.cameraZoom = 1.0;
    
    // 잔상 초기화
    this.afterimages = [];
    this.afterimageTimer = 0;
    
    // 잔상 렌더링용 오프스크린 캔버스 생성
    this.afterimageCanvas = document.createElement('canvas');
    this.afterimageCanvas.width = 200; // 충분한 크기
    this.afterimageCanvas.height = 200;
    this.afterimageCtx = this.afterimageCanvas.getContext('2d');
  },
  
  /**
   * 스프라이트 이미지 로드
   */
  async loadSprites() {
    // idle 애니메이션 로드 (ResourceLoader에서 이미 로드된 이미지 재사용)
    this.sprites.idle = [];
    for (let i = 0; i < 4; i++) {
      const path = `images/messiah/animations/idle/frame_${String(i).padStart(3, '0')}.png`;
      let img = null;
      
      // ResourceLoader에서 이미 로드된 이미지 확인
      if (ResourceLoader) {
        img = ResourceLoader.getImage(path);
      }
      
      // 없으면 새로 로드
      if (!img) {
        img = new Image();
        img.src = path;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
      
      this.sprites.idle.push(img);
    }
    
    // running 애니메이션 로드 (ResourceLoader에서 이미 로드된 이미지 재사용)
    this.sprites.running = [];
    for (let i = 0; i < 8; i++) {
      const path = `images/messiah/animations/running/frame_${String(i).padStart(3, '0')}.png`;
      let img = null;
      
      // ResourceLoader에서 이미 로드된 이미지 확인
      if (ResourceLoader) {
        img = ResourceLoader.getImage(path);
      }
      
      // 없으면 새로 로드
      if (!img) {
        img = new Image();
        img.src = path;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
      
      this.sprites.running.push(img);
    }
    
    // 사망 애니메이션 로드
    this.sprites['falling-back-death'] = [];
    for (let i = 0; i < 7; i++) {
      const path = `images/messiah/animations/falling-back-death/frame_${String(i).padStart(3, '0')}.png`;
      let img = null;
      
      if (typeof ResourceLoader !== 'undefined') {
        img = ResourceLoader.getImage(path);
      }
      
      if (!img) {
        img = new Image();
        img.src = path;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
      
      this.sprites['falling-back-death'].push(img);
    }
    this.deathAnimationDuration = this.sprites['falling-back-death'].length * this.deathAnimationFrameTime;
    
    // 부활 애니메이션 로드
    this.sprites['getting-up'] = [];
    for (let i = 0; i < 5; i++) {
      const path = `images/messiah/animations/getting-up/frame_${String(i).padStart(3, '0')}.png`;
      let img = null;
      
      if (typeof ResourceLoader !== 'undefined') {
        img = ResourceLoader.getImage(path);
      }
      
      if (!img) {
        img = new Image();
        img.src = path;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
      
      this.sprites['getting-up'].push(img);
    }
    this.reviveAnimationDuration = this.sprites['getting-up'].length * this.reviveAnimationFrameTime;
    
    // 클리어 시퀀스용 캐릭터 스프라이트 로드
    this.sprites.character = [];
    for (let i = 0; i < 4; i++) {
      const path = `images/messiah/animations/character/frame_${String(i).padStart(3, '0')}.png`;
      let img = null;
      
      if (typeof ResourceLoader !== 'undefined') {
        img = ResourceLoader.getImage(path);
      }
      
      if (!img) {
        img = new Image();
        img.src = path;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
      
      this.sprites.character.push(img);
    }
  },
  
  /**
   * 업데이트 (델타타임 기반)
   */
  update(dt) {
    // 부활 후 무적 상태 업데이트 (항상 업데이트)
    if (this.isInvincible && this.postReviveInvincibleTimer >= 0) {
      this.postReviveInvincibleTimer += dt;
      if (this.postReviveInvincibleTimer >= this.postReviveInvincibleDuration) {
        this.isInvincible = false;
        this.postReviveInvincibleTimer = 0;
      }
    }
    
    // 클리어 시퀀스 업데이트
    if (this.isClearing) {
      this.updateClearSequence(dt);
      return;
    }
    
    // 사망 애니메이션 재생 중이거나 사망 대기 중이거나 부활 애니메이션 재생 중이면 다른 업데이트 중단
    if (this.isDying || (this.isDead && !this.isReviving) || this.isReviving) {
      this.updateDeathAnimation(dt);
      return;
    }
    
    // 회피 타이머 업데이트
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        // 회피 종료
        this.isInvincible = false;
        this.dashTimer = 0;
      }
    }
    
    // 이동 처리
    this.handleMovement(dt);
    
    // 애니메이션 업데이트
    this.updateAnimation(dt);
    
    // 잔상 업데이트
    this.updateAfterimages(dt);
  },
  
  /**
   * 사망 애니메이션 업데이트
   */
  updateDeathAnimation(dt) {
    if (this.isDying) {
      this.deathAnimationTimer += dt;
      
      // 프레임 업데이트
      const frameIndex = Math.floor(this.deathAnimationTimer / this.deathAnimationFrameTime);
      this.currentFrame = Math.min(frameIndex, this.sprites['falling-back-death'].length - 1);
      
      // 카메라 줌 효과 (점진적 확대)
      const zoomProgress = Math.min(1, this.deathAnimationTimer / this.deathAnimationDuration);
      this.cameraZoom = 1.0 + zoomProgress * 1.5; // 최대 2.5배 확대
      
      // 사망 애니메이션 종료 체크
      if (this.deathAnimationTimer >= this.deathAnimationDuration) {
        this.isDying = false;
        this.isDead = true;
        this.deathWaitTimer = 0; // 대기 타이머 시작
        this.showJudgedText = true; // "JUDGED" 텍스트 표시 시작
        this.judgedTextAnimationTimer = 0; // 애니메이션 타이머 초기화
      }
    } else if (this.isDead && !this.isReviving) {
      // 사망 애니메이션 완료 후 대기 시간
      this.deathWaitTimer += dt;
      
      // "JUDGED" 텍스트 애니메이션 업데이트
      if (this.showJudgedText) {
        this.judgedTextAnimationTimer += dt;
        if (this.judgedTextAnimationTimer > this.judgedTextAnimationDuration) {
          this.judgedTextAnimationTimer = this.judgedTextAnimationDuration; // 최대값 고정
        }
      }
      
      // 카메라 줌 유지 (최대 줌 상태 유지)
      this.cameraZoom = 2.5;
      
      // 대기 후 처리 (부활 가능 시 3초, 불가능 시 5초)
      const waitDuration = this.reviveCount > 0 ? this.reviveWaitDuration : this.deathWaitDuration;
      if (this.deathWaitTimer >= waitDuration && !this.showQuestionMark) {
        // 부활 횟수가 있으면 "?" 타이핑 효과 시작
        if (this.reviveCount > 0) {
          this.showQuestionMark = true;
          this.questionMarkText = '';
          this.questionMarkTimer = 0;
        } else {
          // 부활 횟수가 없으면 게임오버 화면 표시
          if (handleGameOver) {
            handleGameOver('플레이어가 사망했습니다.');
          }
        }
      }
      
      // "?" 타이핑 효과 업데이트
      if (this.showQuestionMark) {
        this.questionMarkTimer += dt;
        const targetText = '?';
        const targetLength = Math.floor(this.questionMarkTimer / this.questionMarkTypingSpeed);
        this.questionMarkText = targetText.substring(0, Math.min(targetLength, targetText.length));
        
        // 타이핑 완료 후 2초 대기
        if (this.questionMarkText.length >= targetText.length) {
          this.reviveWaitTimer += dt;
          
          // 2초 대기 후 부활 애니메이션 시작
          if (this.reviveWaitTimer >= this.reviveWaitDuration) {
            this.showQuestionMark = false;
            this.questionMarkText = '';
            this.questionMarkTimer = 0;
            this.reviveWaitTimer = 0;
            // 부활 애니메이션 시작
            this.startGettingUpAnimation();
          }
        }
      }
    } else if (this.isReviving) {
      this.reviveAnimationTimer += dt;
      
      // 프레임 업데이트
      const frameIndex = Math.floor(this.reviveAnimationTimer / this.reviveAnimationFrameTime);
      this.currentFrame = Math.min(frameIndex, this.sprites['getting-up'].length - 1);
      
      // 카메라 줌 복귀
      const zoomProgress = Math.min(1, this.reviveAnimationTimer / this.reviveAnimationDuration);
      this.cameraZoom = 2.5 - zoomProgress * 1.5; // 2.5배에서 1.0배로 복귀
      
      // 부활 애니메이션 종료 체크
      if (this.reviveAnimationTimer >= this.reviveAnimationDuration) {
        this.isReviving = false;
        this.isDead = false;
        this.reviveCount--; // 부활 횟수 감소
        
        // 체력 회복 (최대 체력의 50%)
        const stats = GameState.playerStats;
        stats.hp = stats.maxHp * 0.5;
        
        // 부활 후 3초간 무적 상태
        this.isInvincible = true;
        this.postReviveInvincibleTimer = 0;
        
        // 1초 후 게임 복귀
        setTimeout(() => {
          this.currentAnimation = 'idle';
          this.currentFrame = 0;
          this.animationTimer = 0;
          this.cameraZoom = 1.0;
        }, 1000);
      }
    }
  },
  
  /**
   * 사망 처리 (애니메이션 시작)
   */
  startDeathAnimation() {
    if (this.isDying || this.isReviving) return; // 이미 사망/부활 애니메이션 중이면 무시
    
    this.isDying = true;
    this.isDead = false; // 애니메이션 중에는 아직 완전히 사망하지 않음
    this.deathAnimationTimer = 0;
    this.currentAnimation = 'falling-back-death';
    this.currentFrame = 0;
    this.animationTimer = 0;
    this.cameraZoom = 1.0;

    // BGM 페이드아웃
    try {
      if (typeof stopBgmWithFade === 'function') {
        stopBgmWithFade(0.8);
      }
    } catch (e) {
      // 무시
    }

    // 사망 사운드
    try {
      const audioEl = ResourceLoader && ResourceLoader.getAudio
        ? ResourceLoader.getAudio('audio/death.mp3')
        : null;
      const sfx = (audioEl ? audioEl.cloneNode() : new Audio('audio/death.mp3'));
      sfx.volume = GameSettings.sfxVolume * 0.01;
      sfx.play().catch(() => {});
    } catch (e) {
      // 무시
    }
  },
  
  /**
   * 부활 애니메이션 시작
   */
  startReviveAnimation() {
    // 부활 시 사망 애니메이션과 동일하게 처리: 사망 애니메이션부터 재생
    this.isDying = true;
    this.isDead = false;
    this.isReviving = false;
    this.deathAnimationTimer = 0;
    this.deathWaitTimer = 0; // 대기 타이머 초기화
    this.showJudgedText = true; // "JUDGED" 텍스트 표시
    this.judgedTextAnimationTimer = 0;
    this.showQuestionMark = false; // "...?" 텍스트는 나중에
    this.questionMarkText = '';
    this.questionMarkTimer = 0;
    this.currentAnimation = 'falling-back-death';
    this.currentFrame = 0;
    this.animationTimer = 0;
    this.cameraZoom = 1.0;
  },
  
  /**
   * 부활 애니메이션 시작 (사망 애니메이션 재생 후 호출)
   */
  startGettingUpAnimation() {
    this.isReviving = true;
    this.isDying = false;
    this.isDead = false;
    this.reviveAnimationTimer = 0;
    this.showJudgedText = false; // "JUDGED" 텍스트 숨김
    this.showQuestionMark = false; // "...?" 텍스트 숨김
    this.questionMarkText = '';
    this.questionMarkTimer = 0;
    this.reviveWaitTimer = 0;
    this.currentAnimation = 'getting-up';
    this.currentFrame = 0;
    this.animationTimer = 0;
  },
  
  /**
   * 클리어 시퀀스 시작
   */
  startClearSequence() {
    this.isClearing = true;
    this.clearSequenceTimer = 0;
    this.clearZoom = 1.0;
    this.showHuntedText = false; // 초기에는 숨김, 줌인 완료 후 표시
    this.huntedTextAnimationTimer = 0;
    this.clearPhase = 0; // Phase 0: 카메라 따라가기
    this.clearCameraReached = false;
    this.clearBossCentered = false;
    this.clearZoomComplete = false;
    
    // 보스는 현재 위치에 유지 (카메라가 따라가도록)
    
    // 캐릭터 스프라이트로 변경 (루프)
    this.currentAnimation = 'character';
    this.currentFrame = 0;
    this.animationTimer = 0;
  },
  
  /**
   * 클리어 시퀀스 업데이트
   */
  updateClearSequence(dt) {
    this.clearSequenceTimer += dt;
    
    // 캐릭터 애니메이션 업데이트 (루프)
    if (this.currentAnimation === 'character') {
      this.animationTimer += dt;
      if (this.animationTimer >= this.frameDuration) {
        this.animationTimer = 0;
        this.currentFrame = (this.currentFrame + 1) % this.sprites.character.length;
      }
    }
    
    // 클리어 시퀀스 단계별 처리 (각 단계가 완료된 후에만 다음 단계로 진행)
    
    // Phase 0: 카메라가 보스를 따라가는 중
    if (this.clearPhase === 0) {
      this.clearZoom = 1.0;
      this.showHuntedText = false;
      
      // 카메라가 보스에 도달했는지 확인 (Camera.update에서 설정됨)
      if (this.clearCameraReached) {
        this.clearPhase = 1; // 다음 단계로 진행
        this.clearSequenceTimer = 0; // 타이머 리셋
      }
    }
    // Phase 1: 보스가 중앙에 도달한 후 유지
    else if (this.clearPhase === 1) {
      const boss = BossSystem?.currentBoss;
      if (!boss) return;
      
      const isMichael = boss.name === 'michael';
      
      // 미카엘은 위치 변경 없이 카메라만 이동, 다른 보스는 화면 중앙으로 이동
      if (isMichael) {
        // 미카엘: 위치 그대로, 카메라만 따라감
        this.clearBossCentered = true;
      } else if (canvas && Camera) {
        // 다른 보스: 화면 중앙으로 이동
        const centerX = canvas.width / 2 + Camera.x;
        const centerY = canvas.height / 2 + Camera.y;
        boss.x = centerX;
        boss.y = centerY;
        
        // 보스가 중앙에 도달했는지 확인
        const distSq = Math.pow(boss.x - centerX, 2) + Math.pow(boss.y - centerY, 2);
        if (distSq < 100) {
          this.clearBossCentered = true;
        }
      }
      
      // 미카엘 사망 시 약간 줌인
      this.clearZoom = (isMichael && boss.isDead) ? 1.2 : 1.0;
      this.showHuntedText = false;
      
      // 중앙 도달 후 지정된 시간 대기
      if (this.clearBossCentered && this.clearSequenceTimer >= this.clearCenterDuration) {
        this.clearPhase = 2; // 다음 단계로 진행
        this.clearSequenceTimer = 0; // 타이머 리셋
      }
    }
    // Phase 2: 줌인 진행
    else if (this.clearPhase === 2) {
      // 줌인 진행 (1초 동안 1.0에서 2.5로)
      const zoomProgress = Math.min(1, this.clearSequenceTimer / this.clearZoomDuration);
      this.clearZoom = 1.0 + zoomProgress * 1.5; // 최대 2.5배 확대
      this.showHuntedText = false; // 줌인 중에는 HUNTED 텍스트 숨김
      
      // 줌인이 완료되었는지 확인
      if (this.clearZoom >= 2.5) {
        this.clearZoomComplete = true;
      }
      
      // 줌인 완료 후 다음 단계로 진행
      if (this.clearZoomComplete && this.clearSequenceTimer >= this.clearZoomDuration) {
        this.clearPhase = 3; // 다음 단계로 진행
        this.clearSequenceTimer = 0; // 타이머 리셋
      }
    }
    // Phase 3: 줌인 완료 후 HUNTED 텍스트 표시
    else if (this.clearPhase === 3) {
      // 줌은 2.5 유지
      this.clearZoom = 2.5;
      // HUNTED 텍스트 표시 시작
      if (!this.showHuntedText) {
        this.showHuntedText = true;
        this.huntedTextAnimationTimer = 0;
      }
      // "HUNTED" 텍스트 애니메이션 업데이트
      this.huntedTextAnimationTimer += dt;
      if (this.huntedTextAnimationTimer > this.huntedTextAnimationDuration) {
        this.huntedTextAnimationTimer = this.huntedTextAnimationDuration;
      }
      
      // 5초 후 클리어 화면으로 전환
      if (this.clearSequenceTimer >= this.clearHuntedDuration) {
        this.isClearing = false;
        this.showHuntedText = false;
        if (typeof handleGameClear !== 'undefined') {
          handleGameClear();
        }
      }
    }
  },
  
  /**
   * 이동 처리
   */
  handleMovement(dt) {
    const stats = GameState.playerStats;
    
    // 회피 중인지 확인
    const isDashing = this.dashTimer > 0;
    
    if (isDashing) {
      // 회피 중: 일직선 이동 (방향 고정)
      this.x += this.dashDirectionX * this.dashSpeed * dt;
      this.y += this.dashDirectionY * this.dashSpeed * dt;
      
      // 회피 방향에 따라 애니메이션 방향 결정
      if (this.dashDirectionX !== 0) {
        this.facingRight = this.dashDirectionX > 0;
      }
    } else {
      // 일반 이동
      let moveX = InputManager.moveX;
      let moveY = InputManager.moveY;
      
      // 이동 방향 저장 (애니메이션 방향 결정)
      if (moveX !== 0) {
        this.facingRight = moveX > 0;
      }
      
      // 이동 적용
      if (moveX !== 0 || moveY !== 0) {
        this.x += moveX * stats.moveSpeed * dt;
        this.y += moveY * stats.moveSpeed * dt;
      }
      
      // 회피 시작 체크
      if (InputManager.dashStarted && this.dashTimer <= 0) {
        // 회피 방향 설정
        this.dashDirectionX = InputManager.dashDirectionX;
        this.dashDirectionY = InputManager.dashDirectionY;
        
        // 회피 시작
        this.dashTimer = this.dashDuration;
        this.isInvincible = true;
        this.afterimageTimer = 0; // 잔상 타이머 리셋
        
        // 플래그 리셋
        InputManager.dashStarted = false;
      }
    }
    
    // 맵 경계 체크 (플레이어 히트박스 크기 사용)
    const hitboxSize = CollisionSystem.hitboxSizes.player || 0.4; // 플레이어 히트박스 비율
    const hitboxWidth = this.width * hitboxSize;
    const hitboxHeight = this.height * hitboxSize;
    const bounds = MapSystem.checkBounds(this.x, this.y, hitboxWidth, hitboxHeight);
    this.x = bounds.x;
    this.y = bounds.y;
  },
  
  /**
   * 애니메이션 업데이트
   */
  updateAnimation(dt) {
    // 사망/부활 애니메이션 중이면 일반 애니메이션 업데이트 하지 않음
    if (this.isDying || this.isReviving) {
      return;
    }
    
    // 이동 중인지에 따라 애니메이션 결정
    const isMoving = InputManager.isMoving();
    const newAnimation = isMoving ? 'running' : 'idle';
    
    // 애니메이션 변경 시 프레임 리셋
    if (this.currentAnimation !== newAnimation) {
      this.currentAnimation = newAnimation;
      this.currentFrame = 0;
      this.animationTimer = 0;
    }
    
    // 애니메이션 타이머 업데이트
    this.animationTimer += dt;
    if (this.animationTimer >= this.frameDuration) {
      this.animationTimer = 0;
      this.currentFrame++;
      
      // 프레임 범위 체크
      const frames = this.sprites[this.currentAnimation];
      if (this.currentFrame >= frames.length) {
        this.currentFrame = 0;
      }
    }
  },
  
  /**
   * 잔상 업데이트
   */
  updateAfterimages(dt) {
    // 회피 중일 때 잔상 생성
    if (this.dashTimer > 0) {
      this.afterimageTimer += dt;
      
      // 일정 간격마다 잔상 생성
      if (this.afterimageTimer >= this.afterimageInterval) {
        this.afterimageTimer = 0;
        this.createAfterimage();
      }
    }
    
    // 잔상 생명주기 업데이트 및 제거
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const afterimage = this.afterimages[i];
      afterimage.lifetime += dt;
      
      // 생명주기 초과 시 제거
      if (afterimage.lifetime >= this.afterimageLifetime) {
        this.afterimages.splice(i, 1);
      }
    }
  },
  
  /**
   * 잔상 생성
   */
  createAfterimage() {
    const frames = this.sprites[this.currentAnimation];
    if (!frames || frames.length === 0) return;
    
    const sprite = frames[this.currentFrame];
    if (!sprite || !sprite.complete) return;
    
    // 잔상 데이터 저장
    this.afterimages.push({
      x: this.x,
      y: this.y,
      sprite: sprite,
      facingRight: this.facingRight,
      lifetime: 0, // 경과 시간
      spriteWidth: this.width,
      spriteHeight: this.height
    });
  },
  
  /**
   * 렌더링
   */
  render(ctx) {
    // 잔상 렌더링 (플레이어보다 먼저 그리기)
    this.renderAfterimages(ctx);
    
    // 플레이어 렌더링
    const frames = this.sprites[this.currentAnimation];
    if (!frames || frames.length === 0) return;
    
    const sprite = frames[this.currentFrame];
    if (!sprite || !sprite.complete) return;
    
    // 스프라이트 크기 (플레이어 크기 사용)
    const spriteWidth = this.width;
    const spriteHeight = this.height;
    
    // 캔버스 저장 (변환 전 상태)
    ctx.save();
    
    // 무적 상태일 때 반투명 효과
    if (this.isInvincible) {
      ctx.globalAlpha = 0.6;
    }
    
    // 플레이어 위치로 이동
    ctx.translate(this.x, this.y);
    
    // 왼쪽을 바라볼 때 가로 뒤집기
    if (!this.facingRight) {
      ctx.scale(-1, 1);
    }
    
    // 스프라이트 그리기 (중앙 기준)
    ctx.drawImage(
      sprite,
      -spriteWidth / 2,
      -spriteHeight / 2,
      spriteWidth,
      spriteHeight
    );
    
    // 캔버스 복원
    ctx.restore();
    
    // 사망 애니메이션 중이거나 사망 대기 중이면 게이지바 비표시
    if (!this.isDying && !(this.isDead && !this.isReviving)) {
      // 체력 게이지바 렌더링 (머리 위, 체력이 최대가 아닐 때만)
      this.renderHealthBar(ctx);
      
      // 대쉬 게이지바 렌더링 (발 밑)
      this.renderDashBar(ctx);
    }
  },
  
  /**
   * 대쉬 게이지바 렌더링 (발 밑)
   */
  renderDashBar(ctx) {
    const dashCooldown = InputManager.dashCooldown;
    const dashCooldownMax = InputManager.dashCooldownMax;
    const dashCharges = InputManager.dashCharges;
    const maxDashCharges = InputManager.maxDashCharges;
    
    const barWidth = 50; // 가로 사이즈 줄임
    const barHeight = 6;
    const segmentWidth = barWidth / maxDashCharges;
    const offsetY = this.height / 2 + 5; // 발 밑 5px (올림)
    
    // 배경 (검은색)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(
      this.x - barWidth / 2,
      this.y + offsetY,
      barWidth,
      barHeight
    );
    
    // 각 충전 세그먼트 렌더링
    for (let i = 0; i < maxDashCharges; i++) {
      const segmentX = this.x - barWidth / 2 + i * segmentWidth;
      const isCharged = i < dashCharges;
      const isCharging = i === dashCharges && dashCooldown > 0;
      
      // 충전 색상 (충전 횟수별로 다른 색상)
      let color;
      if (maxDashCharges === 1) {
        color = '#4a90e2'; // 파란색 (1개)
      } else if (i === 0) {
        color = '#4a90e2'; // 파란색 (첫 번째)
      } else if (i === 1) {
        color = '#4ade80'; // 초록색 (두 번째)
      } else if (i === 2) {
        color = '#ffd700'; // 노란색 (세 번째)
      } else {
        color = '#ff4444'; // 빨간색 (네 번째 이상)
      }
      
      if (isCharged) {
        // 완전히 충전됨
        ctx.fillStyle = color;
        ctx.fillRect(segmentX, this.y + offsetY, segmentWidth, barHeight);
      } else if (isCharging) {
        // 충전 중
        const chargePercent = 1 - (dashCooldown / dashCooldownMax);
        ctx.fillStyle = color;
        ctx.fillRect(segmentX, this.y + offsetY, segmentWidth * chargePercent, barHeight);
      } else {
        // 충전 안 됨
        ctx.fillStyle = '#333333';
        ctx.fillRect(segmentX, this.y + offsetY, segmentWidth, barHeight);
      }
    }
    
    // 테두리
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.x - barWidth / 2,
      this.y + offsetY,
      barWidth,
      barHeight
    );
  },
  
  /**
   * 체력 게이지바 렌더링 (머리 위)
   */
  renderHealthBar(ctx) {
    const stats = GameState.playerStats;
    const maxHp = stats.maxHp;
    const currentHp = stats.hp;
    
    // 체력이 최대면 표시하지 않음
    if (currentHp >= maxHp) return;
    
    const barWidth = 60;
    const barHeight = 6;
    const offsetY = -this.height / 2 - 10; // 머리 위 10px (낮춤)
    
    // 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(
      this.x - barWidth / 2,
      this.y + offsetY,
      barWidth,
      barHeight
    );
    
    // 체력 바
    const hpPercent = currentHp / maxHp;
    const fillWidth = barWidth * hpPercent;
    
    const gradient = ctx.createLinearGradient(
      this.x - barWidth / 2,
      this.y + offsetY,
      this.x - barWidth / 2 + barWidth,
      this.y + offsetY
    );
    gradient.addColorStop(0, '#ff4444');
    gradient.addColorStop(1, '#ff6666');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(
      this.x - barWidth / 2,
      this.y + offsetY,
      fillWidth,
      barHeight
    );
    
    // 테두리
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.x - barWidth / 2,
      this.y + offsetY,
      barWidth,
      barHeight
    );
  },
  
  /**
   * 잔상 렌더링
   */
  renderAfterimages(ctx) {
    for (const afterimage of this.afterimages) {
      // 생명주기에 따른 투명도 계산 (1.0 -> 0.0)
      const progress = afterimage.lifetime / this.afterimageLifetime;
      const alpha = 1.0 - progress; // 페이드 아웃
      
      // 투명도가 너무 낮으면 스킵
      if (alpha <= 0) continue;
      
      // 오프스크린 캔버스에 잔상 렌더링 (배경에 영향 없도록)
      const tempCtx = this.afterimageCtx;
      const tempCanvas = this.afterimageCanvas;
      
      // 오프스크린 캔버스 초기화
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // 오프스크린 캔버스 중앙으로 이동
      tempCtx.save();
      tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
      
      // 왼쪽을 바라볼 때 가로 뒤집기
      if (!afterimage.facingRight) {
        tempCtx.scale(-1, 1);
      }
      
      // 하얀색 틴트 효과를 위한 복합 렌더링
      // 1. 원본 스프라이트를 먼저 그리기
      tempCtx.globalAlpha = alpha * 0.3;
      tempCtx.drawImage(
        afterimage.sprite,
        -afterimage.spriteWidth / 2,
        -afterimage.spriteHeight / 2,
        afterimage.spriteWidth,
        afterimage.spriteHeight
      );
      
      // 2. 스프라이트의 알파 채널을 마스크로 사용
      tempCtx.globalCompositeOperation = 'destination-in';
      tempCtx.globalAlpha = 1.0;
      tempCtx.drawImage(
        afterimage.sprite,
        -afterimage.spriteWidth / 2,
        -afterimage.spriteHeight / 2,
        afterimage.spriteWidth,
        afterimage.spriteHeight
      );
      
      // 3. 마스크된 영역에만 하얀색 틴트 적용
      tempCtx.globalCompositeOperation = 'source-atop';
      tempCtx.globalAlpha = alpha * 0.7;
      tempCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      tempCtx.fillRect(
        -afterimage.spriteWidth / 2,
        -afterimage.spriteHeight / 2,
        afterimage.spriteWidth,
        afterimage.spriteHeight
      );
      
      // 4. screen 모드로 하얀색 틴트 효과 강화
      tempCtx.globalCompositeOperation = 'screen';
      tempCtx.globalAlpha = alpha * 0.4;
      tempCtx.drawImage(
        afterimage.sprite,
        -afterimage.spriteWidth / 2,
        -afterimage.spriteHeight / 2,
        afterimage.spriteWidth,
        afterimage.spriteHeight
      );
      
      tempCtx.restore();
      
      // 오프스크린 캔버스를 메인 캔버스에 그리기
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.translate(afterimage.x, afterimage.y);
      ctx.drawImage(
        tempCanvas,
        -tempCanvas.width / 2,
        -tempCanvas.height / 2
      );
      ctx.restore();
    }
  },
  
  /**
   * 체력 감소 처리
   */
  takeDamage(amount) {
    // 무적 상태면 데미지 무시
    if (this.isInvincible) {
      return false;
    }
    
    // 사망/부활 애니메이션 중이면 데미지 무시
    if (this.isDying || this.isReviving) {
      return false;
    }
    
    const stats = GameState.playerStats;
    const actualDamage = Math.max(1, amount - stats.defense);
    stats.hp = Math.max(0, stats.hp - actualDamage);
    
    // 사망 시 사망 애니메이션 시작
    if (stats.hp <= 0) {
      this.startDeathAnimation();
      return true; // 사망 여부 반환
    }
    
    return false;
  },
  
  /**
   * 체력 재생 처리
   */
  regenerate(dt) {
    const stats = GameState.playerStats;
    if (stats.hp < stats.maxHp && stats.hpRegen > 0) {
      stats.hp = Math.min(stats.maxHp, stats.hp + stats.hpRegen * dt);
    }
  },
  
  /**
   * 자동 공격 업데이트
   */
  updateAutoAttack(dt) {
    const stats = GameState.playerStats;
    
    // 공격 타이머 업데이트
    if (!this.attackTimer) this.attackTimer = 0;
    this.attackTimer += dt;
    
    // 공격 속도에 따른 공격 간격
    const attackInterval = 1.0 / stats.attackSpeed;
    
    if (this.attackTimer >= attackInterval) {
      this.attackTimer = 0;
      this.performAutoAttack();
    }
  },
  
  /**
   * 자동 공격 실행 (가장 가까운 적 또는 보스에게)
   */
  performAutoAttack() {
    // 가장 가까운 타겟 찾기 (적 또는 보스)
    let nearestTarget = null;
    let nearestDist = Infinity;
    
    // 공격 범위 제곱 (Math.sqrt 제거)
    const attackRangeSq = 400 * 400;
    
    // 적 검사
    if (Enemy && Enemy.activeEnemies && Enemy.activeEnemies.length > 0) {
      for (const enemy of Enemy.activeEnemies) {
        if (!enemy.active || enemy.isDead) continue;
        
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const distSq = dx * dx + dy * dy;
        
        // 공격 범위 체크 (기본 400)
        if (distSq <= attackRangeSq && distSq < nearestDist) {
          nearestDist = distSq;
          nearestTarget = enemy;
        }
      }
    }
    
    // 보스 검사
    if (BossSystem && BossSystem.currentBoss) {
      const boss = BossSystem.currentBoss;
      const bossTargetable = boss.name === 'michael' ? boss.useMoveImage : true;
      const dx = boss.x - this.x;
      const dy = boss.y - this.y;
      const distSq = dx * dx + dy * dy;
      
      // 공격 범위 체크 (기본 400)
      if (bossTargetable && distSq <= attackRangeSq && distSq < nearestDist) {
        nearestDist = distSq;
        nearestTarget = boss;
      }
    }
    
    // 가장 가까운 타겟에게 투사체 발사
    if (nearestTarget) {
      const stats = GameState.playerStats;
      const dx = nearestTarget.x - this.x;
      const dy = nearestTarget.y - this.y;
      const angle = Math.atan2(dy, dx);
      
      // 치명타 계산
      const isCrit = Math.random() < stats.critRate;
      const damage = isCrit ? stats.attack * stats.critDamage : stats.attack;
      
      if (Projectile && Projectile.spawn) {
        Projectile.spawn(
          this.x, this.y, angle,
          500, // 투사체 속도
          damage,
          'player'
        );
      }
    }
  }
};

