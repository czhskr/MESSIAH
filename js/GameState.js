/**
 * GameState.js - 게임 상태 관리 모듈
 * 게임의 전역 상태를 관리합니다.
 */

const GameState = {
  // 화면 상태
  currentScreen: 'title', // title, stageSelect, upgrade, game, levelUp, gameOver
  
  // 게임 진행 상태
  currentStage: 2, // 스테이지 2
  unlockedStages: [2], // 해금된 스테이지 목록
  selectedInitialWeapon: 'vorpal-sword', // 초기 무기 선택
  
  // 플레이어 기본 통계(변하지 않는 베이스)
  basePlayerStats: {
    maxHp: 100,
    hpRegen: 1, // 초당 체력 재생
    defense: 0, // 방어력
    attack: 10, // 공격력
    attackSpeed: 1, // 공격 속도
    critRate: 0.05, // 치명타율 (0~1)
    critDamage: 1.5, // 치명타 데미지 배율
    moveSpeed: 300, // 이동 속도 (빠르게)
    luck: 0, // 행운
    mastery: 0 // 숙련도
  },
  
  // 현재 계산된 통계
  playerStats: {
    maxHp: 100,
    hp: 100,
    hpRegen: 0,
    defense: 0,
    attack: 10,
    attackSpeed: 1,
    critRate: 0,
    critDamage: 1.5,
    moveSpeed: 300,
    luck: 0,
    mastery: 0
  },
  
  // 러닝 타임 보너스(무기/레벨업/정산 등 가변)
  bonusStats: {
    maxHp: 0,
    hpRegen: 0,
    defense: 0,
    attack: 0,
    attackSpeed: 0,
    critRate: 0,
    critDamage: 0,
    moveSpeed: 0,
    luck: 0,
    mastery: 0
  },
  
  // 영구 재화 및 누적 처치수
  entropy: 0,          // 스테이지 초기화와 무관하게 누적
  enemyKillCount: 0,   // 총 처치 수 (30마리마다 entropy +1)
  
  // 게임 진행 데이터
  level: 1,
  exp: 0,
  expToNext: 100,
  gold: 0,
  wave: 1,
  maxWave: 10,
  skillPoints: 0, // 스킬포인트 (레벨업 시 획득)
  
  // 업그레이드 레벨 (영구 업그레이드)
  upgrades: {
    maxHp: 0,
    hpRegen: 0,
    defense: 0,
    attack: 0,
    attackSpeed: 0,
    critRate: 0,
    critDamage: 0,
    moveSpeed: 0,
    luck: 0,
    mastery: 0,
    reviveCount: 0, // 부활 횟수 (최대 2)
    dashCharges: 0 // 대쉬 2차지 해금 (최대 1)
  },
  
  // 델타타임 기반 타이머
  speechBubbleDelayTimer: 0, // 말풍선 표시 지연 타이머
  speechBubbleDelay: 0.5, // 말풍선 표시 지연 시간
  showSpeechBubble: false, // 말풍선 표시 플래그
  speechBubbleText: '', // 표시할 말풍선 텍스트
  speechBubbleTarget: null, // 말풍선 표시 대상
  
  skillSelectionDelayTimer: 0, // 스킬 선택 화면 표시 지연 타이머
  skillSelectionDelay: 0.5, // 스킬 선택 화면 표시 지연 시간
  showSkillSelection: false, // 스킬 선택 화면 표시 플래그
  
  // 무기 (게임 중 획득)
  skills: [],
  
  /**
   * 게임 상태 초기화
   */
  init() {
    this.currentScreen = 'title';
    this.currentStage = 1;
    this.unlockedStages = [1, 2]; // 테스트용: 스테이지 2 해금
    this.resetPlayerStats();
    this.level = 1;
    this.exp = 0;
    this.expToNext = 100;
    this.gold = 0;
    this.wave = 1;
    this.maxWave = 10;
    this.skills = [];
    this.skillPoints = 0;
  },
  
  /**
   * 플레이어 통계 초기화 (업그레이드 반영)
   */
  resetPlayerStats() {
    // 러닝 보너스 초기화
    this.bonusStats = {
      maxHp: 0,
      hpRegen: 0,
      defense: 0,
      attack: 0,
      attackSpeed: 0,
      critRate: 0,
      critDamage: 0,
      moveSpeed: 0,
      luck: 0,
      mastery: 0
    };
    
    // 베이스 + 업그레이드 + 보너스 재계산
    this.recalculatePlayerStats(false);
    this.playerStats.hp = this.playerStats.maxHp; // 풀 HP로 시작
  },

  /**
   * 업그레이드가 반영된 베이스 스탯 반환 (보너스 제외)
   */
  getBaseStatWithUpgrades(key) {
    const base = { ...this.basePlayerStats };
    Object.keys(this.upgrades).forEach(k => {
      const lvl = this.upgrades[k];
      if (k === 'maxHp') base.maxHp += lvl * 20;
      else if (k === 'hpRegen') base.hpRegen += lvl * 0.5;
      else if (k === 'defense') base.defense += lvl * 2;
      else if (k === 'attack') base.attack += lvl * 5;
      else if (k === 'attackSpeed') base.attackSpeed += lvl * 0.2;
      else if (k === 'critRate') base.critRate += lvl * 0.05;
      else if (k === 'critDamage') base.critDamage += lvl * 0.1;
      else if (k === 'moveSpeed') base.moveSpeed += lvl * 10;
      else if (k === 'luck') base.luck += lvl * 0.1;
      else if (k === 'mastery') base.mastery += lvl * 0.1;
    });
    return base[key] ?? 0;
  },

  /**
   * 베이스+업그레이드+보너스 종합 스탯 재계산
   * @param {boolean} preserveHpRatio HP 비율 유지 여부
   */
  recalculatePlayerStats(preserveHpRatio = true) {
    const prevMaxHp = this.playerStats?.maxHp || null;
    const prevHp = this.playerStats?.hp || null;
    const base = { ...this.basePlayerStats };
    
    // 업그레이드 적용
    Object.keys(this.upgrades).forEach(k => {
      const lvl = this.upgrades[k];
      if (k === 'maxHp') base.maxHp += lvl * 20;
      else if (k === 'hpRegen') base.hpRegen += lvl * 0.5;
      else if (k === 'defense') base.defense += lvl * 2;
      else if (k === 'attack') base.attack += lvl * 5;
      else if (k === 'attackSpeed') base.attackSpeed += lvl * 0.2;
      else if (k === 'critRate') base.critRate += lvl * 0.05;
      else if (k === 'critDamage') base.critDamage += lvl * 0.1;
      else if (k === 'moveSpeed') base.moveSpeed += lvl * 10;
      else if (k === 'luck') base.luck += lvl * 0.1;
      else if (k === 'mastery') base.mastery += lvl * 0.1;
    });
    
    // 보너스 적용
    const total = { ...base };
    Object.keys(this.bonusStats).forEach(k => {
      if (typeof total[k] === 'number') {
        total[k] += this.bonusStats[k];
      }
    });
    
    // HP 유지/재계산
    if (preserveHpRatio && prevMaxHp) {
      const ratio = Math.max(0, Math.min(1, prevHp / prevMaxHp));
      total.hp = Math.min(total.maxHp, total.maxHp * ratio);
    } else {
      total.hp = total.maxHp;
    }
    
    // 최소값 보정
    total.attack = Math.max(0, total.attack);
    total.attackSpeed = Math.max(0.1, total.attackSpeed);
    total.critRate = Math.max(0, total.critRate);
    total.critDamage = Math.max(1.0, total.critDamage);
    total.moveSpeed = Math.max(0, total.moveSpeed);
    
    this.playerStats = total;
  },

  /**
   * 보너스 스탯 적용 (무기/레벨업/정산 등)
   */
  applyBonusStat(key, amount) {
    if (!(key in this.bonusStats)) return;
    this.bonusStats[key] += amount;
    this.recalculatePlayerStats();
  },
  
  /**
   * 적 처치 시 호출 (50마리마다 엔트로피 +1)
   */
  onEnemyKilled() {
    this.enemyKillCount = (this.enemyKillCount || 0) + 1;
    if (this.enemyKillCount % 30 === 0) {
      this.entropy = (this.entropy || 0) + 1;
    }
  },
  
  /**
   * 화면 전환
   */
  setScreen(screen) {
    this.currentScreen = screen;
  },
  
  /**
   * 스테이지 해금
   */
  unlockStage(stage) {
    if (!this.unlockedStages.includes(stage)) {
      this.unlockedStages.push(stage);
    }
  },
  
  /**
   * EXP 추가 및 레벨업 체크
   * @returns {boolean} 레벨업 여부
   */
  addExp(amount) {
    const bonus = 1 + this.playerStats.mastery;
    this.exp += Math.floor(amount * bonus);
    
    if (this.exp >= this.expToNext) {
      this.levelUp();
      return true;
    }
    return false;
  },
  
  /**
   * 레벨업 처리
   */
  levelUp() {
    this.level++;
    this.exp -= this.expToNext;
    this.expToNext = Math.floor(100 * Math.pow(1.2, this.level - 1));
    // 레벨업 시 스킬포인트 +1
    this.skillPoints++;
  },
  
  /**
   * 금화 추가
   */
  addGold(amount) {
    const bonus = 1 + this.playerStats.luck;
    this.gold += Math.floor(amount * bonus);
  },
  
  /**
   * 업그레이드 구매
   */
  buyUpgrade(type) {
    const cost = this.getUpgradeCost(type);
    const currentLevel = this.upgrades[type];
    
    // 최대 레벨 체크
    if (type === 'reviveCount' && currentLevel >= 2) return false;
    if (type === 'dashCharges' && currentLevel >= 1) return false;
    
    if (this.entropy >= cost) {
      this.entropy -= cost;
      this.upgrades[type]++;
      this.resetPlayerStats(); // 통계 재계산
      
      // 부활 횟수나 대쉬 차지 업그레이드 시 플레이어 상태 업데이트
      if (type === 'reviveCount' && Player) {
        Player.reviveCount = this.upgrades.reviveCount;
      }
      if (type === 'dashCharges' && InputManager) {
        InputManager.maxDashCharges = 1 + this.upgrades.dashCharges;
        InputManager.dashCharges = Math.min(InputManager.dashCharges, InputManager.maxDashCharges);
      }
      
      return true;
    }
    return false;
  },
  
  /**
   * 업그레이드 비용 계산
   */
  getUpgradeCost(type) {
    const level = this.upgrades[type];
    // 엔트로피 고정 비용 테이블
    const costTable = {
      maxHp: 2,
      hpRegen: 1,
      defense: 2,
      attack: 2,
      attackSpeed: 2,
      critRate: 3,
      critDamage: 3,
      moveSpeed: 2,
      luck: 1,
      mastery: 1,
      reviveCount: 10, // 부활 횟수
      dashCharges: 10 // 대쉬 2차지 해금
    };
    const baseCost = costTable[type] ?? 1;
    return baseCost; // 레벨에 따른 증가 없이 고정 비용
  }
};


