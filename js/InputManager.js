/**
 * InputManager.js - 입력 관리 모듈
 * 키보드 입력을 관리하고 상태를 제공합니다.
 */

const InputManager = {
  // 키 상태
  keys: {},
  
  // 이동 방향 (8방향)
  moveX: 0, // -1, 0, 1
  moveY: 0, // -1, 0, 1
  
  // 회피 상태
  dashCooldown: 0,
  dashCooldownMax: 2, // 회피 쿨타임
  dashStarted: false, // 회피 시작 플래그
  
  // 회피 방향 (회피 시작 시점의 방향 저장)
  dashDirectionX: 0,
  dashDirectionY: 0,
  
  // 대쉬 충전 시스템 (추후 대쉬 횟수 추가 능력 대비)
  maxDashCharges: 1, // 최대 대쉬 충전 횟수 (기본 1, 추후 증가 가능)
  dashCharges: 1, // 현재 대쉬 충전 횟수
  
  // 디버그 모드 (Shift 키)
  showHitboxes: false,
  
  /**
   * 초기화
   */
  init() {
    this.keys = {};
    this.moveX = 0;
    this.moveY = 0;
    this.dashCooldown = 0;
    this.dashStarted = false;
    this.dashDirectionX = 0;
    this.dashDirectionY = 0;
    this.maxDashCharges = 1;
    this.dashCharges = 1;
    
    // 키보드 이벤트 리스너
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  },
  
  /**
   * 키 다운 처리
   */
  handleKeyDown(e) {
    this.keys[e.code] = true;
    this.updateMovement();
    
    // Shift: 히트박스 표시 토글
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.showHitboxes = true;
    }
    
    // ESC: 게임 메뉴 토글 (게임 화면에서만)
    if (e.code === 'Escape') {
      e.preventDefault();
      // 게임 화면일 때만 메뉴 토글
      if (GameState && GameState.currentScreen === 'game') {
        if (window && window.MESSIAH && typeof window.MESSIAH.toggleGameMenu === 'function') {
          window.MESSIAH.toggleGameMenu();
        }
      }
      return;
    }
    
    // 스페이스바: 말풍선이 활성화되어 있으면 말풍선 넘기기, 아니면 회피
    if (e.code === 'Space') {
      e.preventDefault();
      
      // 말풍선이 활성화되어 있으면 말풍선 넘기기
      if (SpeechBubble && SpeechBubble.isActive()) {
        SpeechBubble.nextText();
        return;
      }
      
      // 회피 (회피 시작 시점의 방향 저장)
      if (this.dashCharges > 0) {
        // 현재 이동 방향 저장 (이동 중이 아니면 마지막 이동 방향 사용)
        if (this.moveX !== 0 || this.moveY !== 0) {
          this.dashDirectionX = this.moveX;
          this.dashDirectionY = this.moveY;
        } else if (this.dashDirectionX === 0 && this.dashDirectionY === 0) {
          // 처음 회피 시 기본 방향 (오른쪽)
          this.dashDirectionX = 1;
          this.dashDirectionY = 0;
        }
        
        // 회피 시작 신호
        this.dashStarted = true;
        this.dashCharges--; // 대쉬 충전 소모
        this.dashCooldown = this.dashCooldownMax;
      }
    }
  },
  
  /**
   * 키 업 처리
   */
  handleKeyUp(e) {
    this.keys[e.code] = false;
    this.updateMovement();
    
    // Shift: 히트박스 표시 해제
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.showHitboxes = false;
    }
  },
  
  /**
   * 이동 방향 업데이트 (8방향)
   */
  updateMovement() {
    let x = 0, y = 0;
    
    // WASD 이동
    if (this.keys['KeyA']) x -= 1;
    if (this.keys['KeyD']) x += 1;
    if (this.keys['KeyW']) y -= 1;
    if (this.keys['KeyS']) y += 1;
    
    // 대각선 이동 정규화
    if (x !== 0 && y !== 0) {
      x *= 0.707; // 1/√2
      y *= 0.707;
    }
    
    this.moveX = x;
    this.moveY = y;
  },
  
  /**
   * 업데이트 (델타타임 기반)
   */
  update(dt) {
    // 회피 쿨타임 감소
    if (this.dashCooldown > 0) {
      this.dashCooldown -= dt;
      if (this.dashCooldown < 0) {
        this.dashCooldown = 0;
      }
    }
    
    // 대쉬 충전 (쿨타임이 끝나고 충전이 부족하면 1개씩 충전)
    if (this.dashCooldown <= 0 && this.dashCharges < this.maxDashCharges) {
      this.dashCharges++; // 1개씩 충전
      this.dashCooldown = this.dashCooldownMax; // 충전 후 쿨타임 재설정
    }
  },
  
  /**
   * 이동 중인지 확인
   */
  isMoving() {
    return this.moveX !== 0 || this.moveY !== 0;
  }
};

