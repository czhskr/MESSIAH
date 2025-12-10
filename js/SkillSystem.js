/**
 * SkillSystem.js - 무기 시스템 모듈
 * 무기 선택, 슬롯, 합체, 등급, 판매 관리
 */

const SkillSystem = {
  // 무기 슬롯 (최대 6개)
  skillSlots: Array(6).fill(null), // null 또는 무기 객체
  maxSlots: 6,
  
  // 사용 가능한 무기 목록
  availableSkills: [
    {
      id: 'seraphic-edge',
      name: '세라픽 엣지',
      desc: '대미지: 40, 치명타 확률: +20%, 치명타 데미지: +10%',
      baseDamage: 40,
      baseCritRate: 0.2,
      baseCritDamage: 0.1,
      cooldown: 2.0,
      knockback: 1,
      range: 300,
      specialEffect: 'weapon',
      category: 'weapon',
      cost: 50 // 구매 비용 (인하)
    },
    {
      id: 'vorpal-sword',
      name: '보팔 소드',
      desc: '대미지: 30, 치명타 확률: +30%, 치명타 데미지: +15%',
      baseDamage: 30,
      baseCritRate: 0.3,
      baseCritDamage: 0.15,
      cooldown: 1.0,
      knockback: 0,
      range: 300,
      specialEffect: 'weapon',
      category: 'weapon',
      cost: 40 // 구매 비용 (인하)
    },
    {
      id: 'durandal',
      name: '뒤랑달',
      desc: '대미지: 50, 치명타 확률: +5%, 치명타 데미지: +20%',
      baseDamage: 50,
      baseCritRate: 0.05,
      baseCritDamage: 0.2,
      cooldown: 2.5,
      knockback: 2,
      range: 300,
      specialEffect: 'weapon',
      category: 'weapon',
      cost: 60 // 구매 비용 (인하)
    },
    {
      id: 'estoc',
      name: '에스톡',
      desc: '대미지: 20, 치명타 확률: +50%, 치명타 데미지: +50%',
      baseDamage: 20,
      baseCritRate: 0.5,
      baseCritDamage: 0.5,
      cooldown: 1.0,
      knockback: 0,
      range: 200,
      specialEffect: 'weapon',
      category: 'weapon',
      cost: 50 // 구매 비용 (인하)
    },
    {
      id: 'morning-star',
      name: '모닝스타',
      desc: '대미지: 60, 치명타 확률: +0%, 치명타 데미지: +20%',
      baseDamage: 60,
      baseCritRate: 0,
      baseCritDamage: 0.2,
      cooldown: 3.0,
      knockback: 3,
      range: 200,
      specialEffect: 'weapon',
      category: 'weapon',
      cost: 75 // 구매 비용 (인하)
    },
    {
      id: 'guillotine',
      name: '기요틴',
      desc: '대미지: 40, 치명타 확률: +20%, 치명타 데미지: +40%',
      baseDamage: 40,
      baseCritRate: 0.2,
      baseCritDamage: 0.4,
      cooldown: 2.0,
      knockback: 0,
      range: 250,
      specialEffect: 'rotating', // 공격 시 회전 효과
      category: 'weapon',
      cost: 55 // 구매 비용 (인하)
    },
    {
      id: 'longinus',
      name: '롱기누스',
      desc: '대미지: 50, 치명타 확률: +40%, 치명타 데미지: +50%',
      baseDamage: 50,
      baseCritRate: 0.4,
      baseCritDamage: 0.5,
      cooldown: 2.5,
      knockback: 0,
      range: 350,
      specialEffect: 'weapon',
      category: 'weapon',
      cost: 65 // 구매 비용 (인하)
    },
    {
      id: 'rapidFire',
      name: '연사',
      desc: '공격 속도가 50% 증가합니다.',
      baseDamage: 0,
      baseCritRate: 0,
      baseCritDamage: 0,
      cooldown: 0,
      knockback: 0,
      range: 0,
      specialEffect: 'attackSpeed',
      category: 'buff'
    },
    {
      id: 'critBoost',
      name: '치명타 강화',
      desc: '치명타율 +20%, 치명타 데미지 +50%',
      baseDamage: 0,
      baseCritRate: 0.2,
      baseCritDamage: 0.5,
      cooldown: 0,
      knockback: 0,
      range: 0,
      specialEffect: 'crit',
      category: 'buff'
    },
    {
      id: 'healthBoost',
      name: '체력 강화',
      desc: '최대 체력 +50, 체력 재생 +1',
      baseDamage: 0,
      baseCritRate: 0,
      baseCritDamage: 0,
      cooldown: 0,
      knockback: 0,
      range: 0,
      specialEffect: 'health',
      category: 'buff'
    },
    {
      id: 'speedBoost',
      name: '속도 강화',
      desc: '이동 속도 +50',
      baseDamage: 0,
      baseCritRate: 0,
      baseCritDamage: 0,
      cooldown: 0,
      knockback: 0,
      range: 0,
      specialEffect: 'speed',
      category: 'buff'
    },
    {
      id: 'damageBoost',
      name: '공격력 강화',
      desc: '공격력 +20',
      baseDamage: 0,
      baseCritRate: 0,
      baseCritDamage: 0,
      cooldown: 0,
      knockback: 0,
      range: 0,
      specialEffect: 'damage',
      category: 'buff'
    },
    {
      id: 'defenseBoost',
      name: '방어력 강화',
      desc: '방어력 +10',
      baseDamage: 0,
      baseCritRate: 0,
      baseCritDamage: 0,
      cooldown: 0,
      knockback: 0,
      range: 0,
      specialEffect: 'defense',
      category: 'buff'
    },
    {
      id: 'lucky',
      name: '행운의 여신',
      desc: '금화 획득 +30%, EXP 획득 +30%',
      baseDamage: 0,
      baseCritRate: 0,
      baseCritDamage: 0,
      cooldown: 0,
      knockback: 0,
      range: 0,
      specialEffect: 'luck',
      category: 'buff'
    },
    {
      id: 'vampire',
      name: '흡혈',
      desc: '적 처치 시 체력 회복 +5',
      baseDamage: 0,
      baseCritRate: 0,
      baseCritDamage: 0,
      cooldown: 0,
      knockback: 0,
      range: 0,
      specialEffect: 'vampire',
      category: 'passive'
    },
  ],
  
  // 현재 무기 선택지
  currentSkillChoices: [],
  refreshCount: 0, // 현재 정산에서 초기화 횟수
  baseRefreshCost: 5, // 기본 초기화 비용 (무기 리롤도 5부터 시작)
  
  /**
   * 초기화
   */
  init() {
    this.skillSlots = Array(6).fill(null);
    this.currentSkillChoices = [];
    this.refreshCount = 0;
    
    // 초기 무기 지급
    this.giveInitialWeapon();
  },
  
  /**
   * 초기 무기 지급 (선택된 무기 1개)
   */
  giveInitialWeapon() {
    // GameState에서 선택된 초기 무기 가져오기
    const selectedWeaponId = GameState.selectedInitialWeapon || 'vorpal-sword';
    const selectedWeapon = this.availableSkills.find(s => s.id === selectedWeaponId);
    
    if (!selectedWeapon) {
      console.warn(`[SkillSystem] 초기 무기 ${selectedWeaponId}를 찾을 수 없습니다. 보팔 소드를 사용합니다.`);
      const vorpalSword = this.availableSkills.find(s => s.id === 'vorpal-sword');
      if (!vorpalSword) return;
      const weapon = this._createWeaponObject(vorpalSword);
      const emptySlotIndex = this.skillSlots.findIndex(slot => slot === null);
      if (emptySlotIndex !== -1) {
        this.skillSlots[emptySlotIndex] = weapon;
        this.applyWeaponStatsToPlayer(weapon, true);
      }
      return;
    }
    
    // 빈 슬롯 찾기
    const emptySlotIndex = this.skillSlots.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) return; // 슬롯이 가득 찬 경우 중단
    
    // 무기 객체 생성 및 지급
    const weapon = this._createWeaponObject(selectedWeapon);
    this.skillSlots[emptySlotIndex] = weapon;
    
    // 무기 스탯을 플레이어에 적용
    this.applyWeaponStatsToPlayer(weapon, true);
    
    console.log(`[SkillSystem] 초기 무기 지급: ${weapon.name}`);
  },
  
  /**
   * 무기 객체 생성 (내부 함수)
   */
  _createWeaponObject(weaponData) {
    const weapon = {
      id: weaponData.id,
      name: weaponData.name,
      desc: weaponData.desc,
      grade: 1,
      // 기본 스탯 (원본 값 저장)
      baseDamage: weaponData.baseDamage,
      baseCritRate: weaponData.baseCritRate,
      baseCritDamage: weaponData.baseCritDamage,
      // 현재 등급에 따른 스탯 (표시용)
      damage: weaponData.baseDamage,
      critRate: weaponData.baseCritRate,
      critDamage: weaponData.baseCritDamage,
      cooldown: weaponData.cooldown,
      knockback: weaponData.knockback,
      range: weaponData.range,
      specialEffect: weaponData.specialEffect,
      category: weaponData.category,
      timer: 0,
      
      // 무기 전용 속성
      angle: 0,
      radius: 50,
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      targetEnemy: null, // 목표 적 참조 (적이 사라졌는지 확인용)
      isFired: false,
      fireSpeed: 800,
      returnSpeed: 1000,
      cooldownTimer: 0,
      hitCooldowns: new Map(), // 적별 히트 쿨타임 (적 객체를 키로 사용)
      image: null // 이미지는 나중에 로드
    };
    
    // 무기 이미지 로드
    if (ResourceLoader) {
      weapon.image = ResourceLoader.getImage(`images/weapons/${weapon.id}.png`);
    }
    
    return weapon;
  },
  
  /**
   * 등급에 따른 스탯 계산
   * @param {number} baseStat 기본 스탯
   * @param {number} grade 등급
   * @returns {number} 등급이 적용된 스탯
   */
  calculateGradeStat(baseStat, grade) {
    const increaseRate = 0.2; // 등급당 20% 증가
    return baseStat * Math.pow(1 + increaseRate, grade - 1);
  },
  
  /**
   * 웨이브와 행운에 따른 초기 등급 계산
   * @returns {number} 초기 등급 (1-4)
   */
  calculateInitialGrade() {
    // 웨이브 수 (최대 15웨이브에서 최대치)
    const currentWave = WaveSystem ? WaveSystem.currentWave : 1;
    const waveFactor = Math.min(1, currentWave / 15); // 0 ~ 1 (15웨이브에서 1.0)
    
    // 행운 수치 (0 ~ 1 범위로 정규화, 행운이 높을수록 확률 증가)
    const stats = GameState.playerStats;
    const luckFactor = Math.min(1, stats.luck / 2); // 행운 2.0에서 최대치 (200%)
    
    // 등급별 확률 계산
    // 기본 확률 (웨이브와 행운의 평균)
    const baseProbability = (waveFactor + luckFactor) / 2;
    
    // 등급별 확률
    // Grade 1: 기본 확률 (항상 가능)
    // Grade 2: baseProbability * 0.5
    // Grade 3: baseProbability * 0.25
    // Grade 4: baseProbability * 0.1
    
    const random = Math.random();
    
    if (random < baseProbability * 0.1) {
      // Grade 4 (10% 확률)
      return 4;
    } else if (random < baseProbability * 0.25) {
      // Grade 3 (15% 확률)
      return 3;
    } else if (random < baseProbability * 0.5) {
      // Grade 2 (25% 확률)
      return 2;
    } else {
      // Grade 1 (기본)
      return 1;
    }
  },
  
  /**
   * 무기 선택지 생성 (랜덤 3개) - 무기만 선택
   */
  generateSkillChoices() {
    // 무기 카테고리만 필터링
    const available = this.availableSkills.filter(skill => skill.category === 'weapon');
    const choices = [];
    
    for (let i = 0; i < 3 && available.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      choices.push(available[randomIndex]);
      available.splice(randomIndex, 1);
    }
    
    this.currentSkillChoices = choices;
  },
  
  /**
   * 무기 선택 화면 표시
   */
  showSkillSelection() {
    this.refreshCount = 0; // 정산에서 넘어올 때 초기화 횟수 리셋
    this.generateSkillChoices();
    // 화면 전환은 SettlementSystem.showSkillSelection()에서 처리
    // 이미 levelUp 화면으로 전환되었을 수 있으므로 중복 호출 방지
    if (GameState.currentScreen !== 'levelUp') {
      showScreen('levelUp');
    }
    this.updateSkillUI();
  },
  
  /**
   * 무기 선택 (구매)
   */
  selectSkill(skillId, ignoreCost = false) {
    const skillData = this.availableSkills.find(s => s.id === skillId);
    if (!skillData) return;
    
    // 구매 비용 확인 (비용 무시 옵션이 없을 때만)
    if (!ignoreCost) {
      const cost = skillData.cost || 100;
      if (GameState.gold < cost) {
        alert(`금화가 부족합니다. 필요: ${cost} 금화`);
        return;
      }
      
      // 금화 소모
      GameState.gold -= cost;
    }
    
    // 빈 슬롯 찾기
    const emptySlotIndex = this.skillSlots.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) {
      alert('무기 슬롯이 가득 찼습니다!');
      return;
    }
    
    // 웨이브와 행운에 따른 초기 등급 계산
    const initialGrade = this.calculateInitialGrade();
    
    // 무기 객체 생성
    const skill = {
      id: skillId,
      name: skillData.name,
      desc: skillData.desc,
      grade: initialGrade, // 웨이브와 행운에 따라 결정된 등급
      // 기본 스탯 (원본 값 저장)
      baseDamage: skillData.baseDamage,
      baseCritRate: skillData.baseCritRate,
      baseCritDamage: skillData.baseCritDamage,
      // 현재 등급에 따른 스탯 (표시용, 초기 등급 반영)
      damage: this.calculateGradeStat(skillData.baseDamage, initialGrade),
      critRate: this.calculateGradeStat(skillData.baseCritRate, initialGrade),
      critDamage: this.calculateGradeStat(skillData.baseCritDamage, initialGrade),
      cooldown: skillData.cooldown,
      knockback: skillData.knockback,
      range: skillData.range,
      specialEffect: skillData.specialEffect,
      category: skillData.category,
      timer: 0, // 쿨다운 타이머
      
      // 무기 전용 속성 (weapon 카테고리인 경우)
      angle: 0,
      radius: 50,
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
        targetX: 0,
        targetY: 0,
        targetEnemy: null, // 목표 적 참조 (적이 사라졌는지 확인용)
        isFired: false,
        fireSpeed: 800,
        returnSpeed: 1000,
        cooldownTimer: 0,
        hitCooldowns: new Map(), // 적별 히트 쿨타임 (적 객체를 키로 사용)
        image: null, // 무기 이미지
        rotationAngle: 0 // 회전 각도 (기요틴 등 회전 무기용)
    };
    
    // 무기 이미지 로드
    if (skillData.category === 'weapon' && ResourceLoader) {
      skill.image = ResourceLoader.getImage(`images/weapons/${skillId}.png`);
    }
    
    // 슬롯에 추가
    this.skillSlots[emptySlotIndex] = skill;
    
    // 무기 스탯을 플레이어 스탯에 추가
    if (skill.category === 'weapon') {
      this.applyWeaponStatsToPlayer(skill, true);
    }
    
    // 무기인 경우 위치 계산
    if (skillData.category === 'weapon') {
      this.updateWeaponPositions();
    }
    
    // 무기 효과 적용
    this.applySkillEffect(skill);
    
    // GameState에 추가
    if (!GameState.skills.includes(skillId)) {
      GameState.skills.push(skillId);
    }
    
    // 무기 선택 완료 후 UI 업데이트 (웨이브 시작 버튼 표시)
    this.updateSkillUI();
    
    // 금화 표시 업데이트
    const goldInfo = document.querySelector('.skill-gold-info');
    if (goldInfo) {
      goldInfo.textContent = `보유 금화: ${GameState.gold}`;
    }
  },
  
  /**
   * 무기 효과 적용
   */
  applySkillEffect(skill) {
    const gradeMultiplier = 1 + (skill.grade - 1) * 0.2; // 등급당 20% 증가
    
    switch (skill.specialEffect) {
      case 'attackSpeed': {
        const base = GameState.getBaseStatWithUpgrades('attackSpeed');
        const factor = 1.5 * gradeMultiplier;
        const bonus = base * (factor - 1);
        GameState.applyBonusStat('attackSpeed', bonus);
        break;
      }
      case 'crit':
        GameState.applyBonusStat('critRate', skill.critRate * gradeMultiplier);
        GameState.applyBonusStat('critDamage', skill.critDamage * gradeMultiplier);
        break;
      case 'health':
        GameState.applyBonusStat('maxHp', 50 * gradeMultiplier);
        GameState.applyBonusStat('hpRegen', 1 * gradeMultiplier);
        break;
      case 'speed':
        GameState.applyBonusStat('moveSpeed', 50 * gradeMultiplier);
        break;
      case 'damage':
        GameState.applyBonusStat('attack', 20 * gradeMultiplier);
        break;
      case 'defense':
        GameState.applyBonusStat('defense', 10 * gradeMultiplier);
        break;
      case 'luck':
        GameState.applyBonusStat('luck', 0.3 * gradeMultiplier);
        GameState.applyBonusStat('mastery', 0.3 * gradeMultiplier);
        break;
      case 'vampire':
        // 흡혈 (적 처치 시 처리)
        break;
    }
  },
  
  /**
   * 무기 합체
   */
  mergeSkills(slotIndex1, slotIndex2) {
    const skill1 = this.skillSlots[slotIndex1];
    const skill2 = this.skillSlots[slotIndex2];
    
    if (!skill1 || !skill2) return false;
    if (skill1.id !== skill2.id) return false; // 같은 무기만 합체 가능
    if (skill1.grade !== skill2.grade) return false; // 같은 등급만 합체 가능
    if (skill1.grade >= 4) return false; // 최대 등급 4
    
    // 이전 등급의 스탯을 플레이어에서 제거
    if (skill1.category === 'weapon') {
      this.applyWeaponStatsToPlayer(skill1, false);
    }
    
    // 등급 증가
    skill1.grade++;
    
    // 무기 스테이터스 증가 (등급에 따른 계산)
    skill1.damage = this.calculateGradeStat(skill1.baseDamage, skill1.grade);
    skill1.critRate = this.calculateGradeStat(skill1.baseCritRate, skill1.grade);
    skill1.critDamage = this.calculateGradeStat(skill1.baseCritDamage, skill1.grade);
    // 넉백은 등급 상승 시 증가하지 않음
    const increaseRate = 0.4; // range와 cooldown용
    skill1.range = skill1.range * (1 + increaseRate);
    if (skill1.cooldown > 0) {
      skill1.cooldown *= (1 - increaseRate * 0.1); // 쿨다운은 10% 감소
    }
    
    // 새 등급의 스탯을 플레이어에 추가
    if (skill1.category === 'weapon') {
      this.applyWeaponStatsToPlayer(skill1, true);
    }
    
    // 두 번째 무기 제거
    this.skillSlots[slotIndex2] = null;
    
    // 효과 재적용
    this.applySkillEffect(skill1);
    
    return true;
  },
  
  /**
   * 무기 스탯을 플레이어 스탯에 적용/제거
   */
  applyWeaponStatsToPlayer(weapon, isAdd) {
    if (!weapon || weapon.category !== 'weapon') return;
    
    const multiplier = isAdd ? 1 : -1;
    
    // 등급에 따른 스탯 계산
    const weaponDamage = weapon.damage || 0;
    const weaponCritRate = weapon.critRate || 0;
    const weaponCritDamage = weapon.critDamage || 0;
    
    // 플레이어 스탯에 더하기/빼기
    GameState.applyBonusStat('attack', weaponDamage * multiplier);
    GameState.applyBonusStat('critRate', weaponCritRate * multiplier);
    GameState.applyBonusStat('critDamage', weaponCritDamage * multiplier);
  },
  
  /**
   * 무기 판매
   */
  sellSkill(slotIndex) {
    const skill = this.skillSlots[slotIndex];
    if (!skill) return false;
    
    // 등급에 따른 판매 가격
    const basePrice = 50;
    const price = basePrice * skill.grade;
    
    GameState.gold += price;
    
    // 무기 스탯을 플레이어 스탯에서 제거
    if (skill.category === 'weapon') {
      this.applyWeaponStatsToPlayer(skill, false);
    }
    
    // 무기 제거
    this.skillSlots[slotIndex] = null;
    
    // 무기 위치 업데이트
    if (skill.category === 'weapon') {
      this.updateWeaponPositions();
    }
    
    // GameState에서 제거
    const index = GameState.skills.indexOf(skill.id);
    if (index > -1) {
      GameState.skills.splice(index, 1);
    }
    
    return true;
  },
  
  /**
   * 무기 선택 완료
   */
  completeSkillSelection() {
    showScreen('game');
    this.currentSkillChoices = [];
    
    // 정산 시스템에 완료 신호 전달
    if (SettlementSystem) {
      SettlementSystem.completeSkillSelection();
    }
  },
  
  /**
   * 무기 선택지 초기화
   */
  refreshSkillChoices() {
    const cost = this.getRefreshCost();
    if (GameState.gold < cost) {
      alert(`금화가 부족합니다. 필요: ${cost} 금화`);
      return;
    }
    
    GameState.gold -= cost;
    this.refreshCount++;
    this.generateSkillChoices();
    this.updateSkillUI();
  },
  
  /**
   * 초기화 비용 계산
   */
  getRefreshCost() {
    return Math.floor(this.baseRefreshCost * Math.pow(1.5, this.refreshCount));
  },
  
  /**
   * 무기 UI 업데이트
   */
  updateSkillUI() {
    // 플레이어 스탯 표시
    const statsDisplay = document.getElementById('skillSelectionStatsDisplay');
    if (statsDisplay) {
      const stats = GameState.playerStats;
      
      // 스탯 설명 데이터
      const statDescriptions = {
        '체력': '플레이어의 현재 체력과 최대 체력입니다. 0이 되면 게임 오버됩니다.',
        '체력 재생': '초당 자동으로 회복되는 체력량입니다.',
        '방어력': '받는 피해를 감소시키는 능력치입니다. 방어력이 높을수록 적의 공격으로부터 받는 피해가 줄어듭니다.',
        '공격력': '플레이어의 기본 공격력입니다. 무기와 합쳐져 최종 대미지가 결정됩니다.',
        '공격 속도': '초당 공격 가능한 횟수입니다. 높을수록 빠르게 공격할 수 있습니다.',
        '치명타율': '공격 시 치명타가 발생할 확률입니다. 치명타는 일반 공격보다 더 큰 피해를 줍니다.',
        '치명타 데미지': '치명타 발생 시 추가로 입히는 피해 비율입니다.',
        '이동 속도': '플레이어의 이동 속도입니다. 높을수록 빠르게 움직일 수 있습니다.',
        '행운': '골드 획득량에 영향을 줍니다.',
        '숙련도': '경험치 획득량에 가산 효과를 줍니다.',
        '레벨': '플레이어의 현재 레벨입니다. 레벨이 오를수록 스탯이 증가합니다.',
        'EXP': '현재 경험치와 다음 레벨까지 필요한 경험치입니다.'
      };
      
      const statsHTML = [
        { label: '체력', value: `${Math.floor(stats.hp)} / ${Math.floor(stats.maxHp)}` },
        { label: '체력 재생', value: `${stats.hpRegen.toFixed(1)}/초` },
        { label: '방어력', value: `${Math.floor(stats.defense)}` },
        { label: '공격력', value: `${Math.floor(stats.attack)}` },
        { label: '공격 속도', value: `${stats.attackSpeed.toFixed(1)}/초` },
        { label: '치명타율', value: `${(stats.critRate * 100).toFixed(1)}%` },
        { label: '치명타 데미지', value: `${(stats.critDamage * 100).toFixed(0)}%` },
        { label: '이동 속도', value: `${Math.floor(stats.moveSpeed)}` },
        { label: '행운', value: `${(stats.luck * 100).toFixed(1)}%` },
        { label: '숙련도', value: `${(stats.mastery * 100).toFixed(1)}%` },
        { label: '레벨', value: `${GameState.level}` },
        { label: 'EXP', value: `${GameState.exp} / ${GameState.expToNext}` }
      ];
      
      statsDisplay.innerHTML = statsHTML.map(stat => `
        <div class="stat-item" data-stat="${stat.label}">
          <span class="stat-label">${stat.label}:</span>
          <span class="stat-value">${stat.value}</span>
          <div class="stat-tooltip">
            <div class="stat-tooltip-title">${stat.label}</div>
            <div>${statDescriptions[stat.label] || '설명 없음'}</div>
          </div>
        </div>
      `).join('');
      
      // 툴팁 위치 업데이트 이벤트
      statsDisplay.querySelectorAll('.stat-item').forEach(item => {
        item.addEventListener('mousemove', (e) => {
          const tooltip = item.querySelector('.stat-tooltip');
          if (tooltip) {
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
          }
        });
      });
    }
    
    const choicesEl = document.getElementById('skillChoices');
    if (choicesEl) {
      choicesEl.innerHTML = '';
      
      this.currentSkillChoices.forEach(skill => {
        const choiceEl = document.createElement('div');
        choiceEl.className = 'skill-choice';
        
        // 설명 텍스트를 줄바꿈으로 정리
        const descLines = skill.desc.split(', ').map(line => line.trim());
        const descHtml = descLines.map(line => `<div>${line}</div>`).join('');
        
        // 구매 비용 확인
        const cost = skill.cost || 100;
        const canAfford = GameState.gold >= cost;
        
        choiceEl.innerHTML = `
          <div class="skill-name">${skill.name}</div>
          <div class="skill-desc">${descHtml}</div>
          <div class="skill-cost" style="margin-top: 10px; color: ${canAfford ? '#ffd700' : '#ff4444'}; font-weight: bold;">
            비용: ${cost} 금화
          </div>
        `;
        
        if (!canAfford) {
          choiceEl.classList.add('disabled');
        }
        
        choiceEl.addEventListener('click', () => {
          if (canAfford) {
            this.selectSkill(skill.id);
          } else {
            alert(`금화가 부족합니다. 필요: ${cost} 금화`);
          }
        });
        
        choicesEl.appendChild(choiceEl);
      });
    }
    
    // 초기화 버튼 비용 표시
    const refreshBtn = document.getElementById('refreshSkillChoicesBtn');
    if (refreshBtn) {
      const cost = this.getRefreshCost();
      refreshBtn.textContent = `초기화 (${cost} 금화)`;
    }
    
    // 금화 표시 추가/업데이트 (skill-actions 영역)
    const skillActions = document.querySelector('.skill-actions');
    if (skillActions) {
      let goldInfo = skillActions.querySelector('.skill-gold-info');
      if (!goldInfo) {
        goldInfo = document.createElement('div');
        goldInfo.className = 'skill-gold-info';
        goldInfo.style.cssText = 'margin: 15px 0; font-size: 1.2rem; color: #ffd700; text-align: center;';
        skillActions.insertBefore(goldInfo, skillActions.firstChild);
      }
      goldInfo.textContent = `보유 금화: ${GameState.gold}`;
    }
    
    // 웨이브 시작 버튼 표시
    const startWaveBtn = document.getElementById('startWaveBtn');
    if (startWaveBtn) {
      startWaveBtn.style.display = 'block';
    }
    
    // 무기 슬롯 표시 (합체/판매 기능 포함)
    this.updateWeaponSlotsUI();
  },
  
  /**
   * 무기 슬롯 UI 업데이트 (합체/판매 기능)
   */
  updateWeaponSlotsUI() {
    const slotsDisplay = document.getElementById('weaponSlotsDisplay');
    if (!slotsDisplay) return;
    
    slotsDisplay.innerHTML = '';
    
    // 6개 슬롯 표시
    for (let i = 0; i < this.maxSlots; i++) {
      const weapon = this.skillSlots[i];
      const slotEl = document.createElement('div');
      slotEl.className = 'weapon-slot';
      slotEl.dataset.slotIndex = i;
      
      if (weapon) {
        // 무기 스탯 (툴팁용 - 무기가 제공하는 보너스만 표시)
        const statsHtml = `
          <div class="weapon-stat-item">공격력 보너스: +${Math.floor(weapon.damage)}</div>
          <div class="weapon-stat-item">치명타율 보너스: +${(weapon.critRate * 100).toFixed(1)}%</div>
          <div class="weapon-stat-item">치명타 데미지 보너스: +${(weapon.critDamage * 100).toFixed(0)}%</div>
          <div class="weapon-stat-item">쿨다운: ${weapon.cooldown.toFixed(1)}초</div>
          <div class="weapon-stat-item">넉백: ${weapon.knockback}</div>
          <div class="weapon-stat-item">범위: ${weapon.range}</div>
        `;
        
        // 무기가 있는 슬롯
        slotEl.innerHTML = `
          <div class="weapon-slot-content">
            <div class="weapon-slot-name">${weapon.name}</div>
            <div class="weapon-slot-grade">등급 ${weapon.grade}</div>
            <div class="weapon-slot-actions">
              <button class="btn-slot-action" data-action="merge" data-slot="${i}">합체</button>
              <button class="btn-slot-action" data-action="sell" data-slot="${i}">판매</button>
            </div>
          </div>
          <div class="weapon-slot-tooltip">
            <div class="weapon-tooltip-title">${weapon.name}</div>
            ${statsHtml}
          </div>
        `;
        slotEl.classList.add('has-weapon');
        
        // 등급별 테두리 색상 적용
        if (weapon.grade === 2) {
          slotEl.classList.add('grade-2');
        } else if (weapon.grade === 3) {
          slotEl.classList.add('grade-3');
        } else if (weapon.grade >= 4) {
          slotEl.classList.add('grade-4');
        }
      } else {
        // 빈 슬롯
        slotEl.innerHTML = `
          <div class="weapon-slot-content">
            <div class="weapon-slot-empty">빈 슬롯</div>
          </div>
        `;
        slotEl.classList.add('empty-slot');
      }
      
      slotsDisplay.appendChild(slotEl);
      
      // 무기 툴팁 위치 업데이트 이벤트 (스탯 툴팁과 동일한 로직)
      if (weapon) {
        slotEl.addEventListener('mousemove', (e) => {
          const tooltip = slotEl.querySelector('.weapon-slot-tooltip');
          if (tooltip && slotEl.matches(':hover')) {
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
          }
        });
      }
    }
    
    // 슬롯 액션 이벤트 리스너
    slotsDisplay.querySelectorAll('.btn-slot-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const slotIndex = parseInt(btn.dataset.slot);
        
        if (action === 'merge') {
          this.handleWeaponMerge(slotIndex);
        } else if (action === 'sell') {
          this.handleWeaponSell(slotIndex);
        }
      });
    });
    
    // 합체 모드: 첫 번째 슬롯 클릭 시 합체 대상 선택
    let mergeMode = false;
    let mergeSourceSlot = -1;
    
    slotsDisplay.querySelectorAll('.weapon-slot.has-weapon').forEach(slot => {
      slot.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-slot-action')) return;
        
        const slotIndex = parseInt(slot.dataset.slotIndex);
        
        if (!mergeMode) {
          // 합체 모드 시작
          mergeMode = true;
          mergeSourceSlot = slotIndex;
          slot.classList.add('merge-source');
          slotsDisplay.querySelectorAll('.weapon-slot.has-weapon').forEach(s => {
            if (s !== slot) {
              s.classList.add('merge-target');
            }
          });
        } else {
          // 합체 대상 선택
          if (slotIndex !== mergeSourceSlot) {
            const success = this.mergeSkills(mergeSourceSlot, slotIndex);
            if (success) {
              this.updateWeaponSlotsUI();
            }
          }
          // 합체 모드 해제
          mergeMode = false;
          mergeSourceSlot = -1;
          slotsDisplay.querySelectorAll('.weapon-slot').forEach(s => {
            s.classList.remove('merge-source', 'merge-target');
          });
        }
      });
    });
  },
  
  /**
   * 무기 합체 처리
   */
  handleWeaponMerge(slotIndex) {
    const sourceWeapon = this.skillSlots[slotIndex];
    if (!sourceWeapon) return;
    
    // 같은 무기이고 같은 등급인 무기 찾기
    let targetSlotIndex = -1;
    for (let i = 0; i < this.skillSlots.length; i++) {
      if (i === slotIndex) continue;
      const weapon = this.skillSlots[i];
      if (weapon && weapon.id === sourceWeapon.id && weapon.grade === sourceWeapon.grade) {
        targetSlotIndex = i;
        break;
      }
    }
    
    if (targetSlotIndex === -1) {
      alert('합체할 수 있는 같은 무기를 찾을 수 없습니다.\n(같은 무기, 같은 등급 필요)');
      return;
    }
    
    // 합체 실행
    const success = this.mergeSkills(slotIndex, targetSlotIndex);
    if (success) {
      // UI 업데이트
      this.updateWeaponSlotsUI();
      this.updateSkillUI();
    }
    
    // 보유 금화 표시
  },
  
  /**
   * 무기 판매 처리
   */
  handleWeaponSell(slotIndex) {
    if (confirm(`${this.skillSlots[slotIndex].name}을(를) 판매하시겠습니까?`)) {
      this.sellSkill(slotIndex);
      this.updateWeaponSlotsUI();
      this.updateSkillUI(); // 금화 표시 업데이트
    }
  },
  
  /**
   * 무기 위치 업데이트 (무기 추가/제거 시 호출)
   */
  updateWeaponPositions() {
    const weapons = this.skillSlots.filter(s => s && s.category === 'weapon');
    const weaponCount = weapons.length;
    
    if (weaponCount === 0) return;
    
    // 각 무기의 위치 계산
    weapons.forEach((weapon, index) => {
      if (weaponCount === 1) {
        // 1개: 플레이어 우측 (0도)
        weapon.angle = 0;
      } else {
        // 2개 이상: 균등 분배
        weapon.angle = (index / weaponCount) * Math.PI * 2;
      }
      
      weapon.radius = 50; // 플레이어로부터 50px 거리
    });
  },
  
  /**
   * 무기 업데이트 (게임 루프에서 호출)
   */
  update(dt) {
    if (!Player) return;
    
    // 활성 무기의 쿨다운 업데이트
    for (const skill of this.skillSlots) {
      if (!skill) continue;
      
      if (skill.timer > 0) {
        skill.timer -= dt;
      }
      
      // 무기인 경우 위치 및 발사 처리
      if (skill.category === 'weapon') {
        // 쿨타임 업데이트
        if (skill.cooldownTimer > 0) {
          skill.cooldownTimer -= dt;
        }
        
        // 적별 히트 쿨타임 업데이트
        if (skill.hitCooldowns) {
          for (const [enemy, cooldown] of skill.hitCooldowns.entries()) {
            if (cooldown <= 0 || !enemy.active || enemy.isDead) {
              skill.hitCooldowns.delete(enemy);
            } else {
              skill.hitCooldowns.set(enemy, cooldown - dt);
            }
          }
        }
        
        // 발사 중이 아닐 때 초기 위치 계산
        if (!skill.isFired) {
          const baseAngle = skill.angle;
          skill.baseX = Player.x + Math.cos(baseAngle) * skill.radius;
          skill.baseY = Player.y + Math.sin(baseAngle) * skill.radius;
          skill.x = skill.baseX;
          skill.y = skill.baseY;
          
          // 쿨타임이 끝나면 발사
          if (skill.cooldownTimer <= 0) {
            this.fireWeapon(skill);
          }
        } else {
          // 발사 중: 목표 타겟이 여전히 존재하는지 확인
          let targetValid = false;
          if (skill.targetEnemy) {
            // 적인 경우
            if (skill.targetEnemy.active !== undefined) {
              targetValid = skill.targetEnemy.active && !skill.targetEnemy.isDead;
            } 
            // 보스인 경우
            else if (BossSystem && BossSystem.currentBoss === skill.targetEnemy) {
              targetValid = skill.targetEnemy.hp > 0;
            }
          }
          
          if (!targetValid) {
            // 목표 타겟이 사라졌으면 즉시 복귀
            skill.isFired = false;
            skill.targetEnemy = null;
            skill.targetX = skill.baseX;
            skill.targetY = skill.baseY;
            skill.cooldownTimer = skill.cooldown;
          } else {
            // 기요틴 회전 효과 (발사 중일 때만)
            if (skill.specialEffect === 'rotating' && skill.isFired) {
              skill.rotationAngle += dt * 20; // 초당 20라디안 회전 (약 1146도/초)
              if (skill.rotationAngle > Math.PI * 2) {
                skill.rotationAngle -= Math.PI * 2;
              }
            } else if (!skill.isFired) {
              // 발사 중이 아니면 회전 각도 리셋
              skill.rotationAngle = 0;
            }
            
            // 목표 지점으로 이동 (타겟이 살아있으면 타겟 위치를 계속 추적)
            if (skill.targetEnemy) {
              // 타겟이 적인 경우
              if (skill.targetEnemy.active !== undefined) {
                skill.targetX = skill.targetEnemy.x;
                skill.targetY = skill.targetEnemy.y;
              }
              // 타겟이 보스인 경우
              else if (BossSystem && BossSystem.currentBoss === skill.targetEnemy) {
                skill.targetX = skill.targetEnemy.x;
                skill.targetY = skill.targetEnemy.y;
              }
            }
            
            const dx = skill.targetX - skill.x;
            const dy = skill.targetY - skill.y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < 25) { // 5 * 5
              // 목표 도달: 복귀 시작
              skill.isFired = false;
              skill.targetEnemy = null;
              skill.targetX = skill.baseX;
              skill.targetY = skill.baseY;
              skill.cooldownTimer = skill.cooldown;
            } else {
              // 목표로 이동
              const dist = Math.sqrt(distSq);
              const moveDist = skill.fireSpeed * dt;
              skill.x += (dx / dist) * moveDist;
              skill.y += (dy / dist) * moveDist;
            }
          }
        }
        
        // 복귀 중: 초기 위치로 이동
        if (!skill.isFired && (Math.abs(skill.x - skill.baseX) > 1 || Math.abs(skill.y - skill.baseY) > 1)) {
          const dx = skill.baseX - skill.x;
          const dy = skill.baseY - skill.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < 25) { // 5 * 5
            // 복귀 완료
            skill.x = skill.baseX;
            skill.y = skill.baseY;
          } else {
            // 복귀 이동
            const dist = Math.sqrt(distSq);
            const moveDist = skill.returnSpeed * dt;
            skill.x += (dx / dist) * moveDist;
            skill.y += (dy / dist) * moveDist;
          }
        }
      }
    }
  },
  
  /**
   * 무기 발사
   */
  fireWeapon(weapon) {
    // 가장 가까운 타겟 찾기 (적 또는 보스)
    let nearestTarget = null;
    let nearestDist = Infinity;
    
    // 적 검사
    if (Enemy && Enemy.activeEnemies && Enemy.activeEnemies.length > 0) {
      for (const enemy of Enemy.activeEnemies) {
        if (!enemy.active || enemy.isDead) continue;
        
        const dx = enemy.x - weapon.x;
        const dy = enemy.y - weapon.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 무기 범위 체크
        if (dist <= weapon.range && dist < nearestDist) {
          nearestDist = dist;
          nearestTarget = enemy;
        }
      }
    }
    
    // 보스 검사
    if (BossSystem && BossSystem.currentBoss) {
      const boss = BossSystem.currentBoss;
      // 미카엘은 move 상태(useMoveImage)에서만 조준/공격
      const bossTargetable = boss.name === 'michael' ? boss.useMoveImage : true;
      const dx = boss.x - weapon.x;
      const dy = boss.y - weapon.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 무기 범위 체크
      if (bossTargetable && dist <= weapon.range && dist < nearestDist) {
        nearestDist = dist;
        nearestTarget = boss;
      }
    }
    
    // 타겟이 있으면 발사
    if (nearestTarget) {
      weapon.targetX = nearestTarget.x;
      weapon.targetY = nearestTarget.y;
      weapon.targetEnemy = nearestTarget; // 목표 타겟 참조 저장
      weapon.isFired = true;
      weapon.cooldownTimer = weapon.cooldown; // 쿨타임 설정

      // 공격 사운드 재생 (타겟이 있을 때만)
      if (!this.attackAudio) {
        const audioEl = ResourceLoader && ResourceLoader.getAudio
          ? ResourceLoader.getAudio('audio/attack.mp3')
          : null;
        this.attackAudio = audioEl || new Audio('audio/attack.mp3');
        this.attackAudio.volume = GameSettings.sfxVolume * 0.01 * 0.7; // 70% 스케일
      }
      try {
        const sfx = this.attackAudio.cloneNode();
        sfx.volume = this.attackAudio.volume;
        sfx.play().catch(() => {});
      } catch (e) {
        // 무시
      }
    }
  },
  
  /**
   * 무기와 적 충돌 검사 (게임 루프에서 호출)
   */
  checkWeaponCollisions() {
    for (const weapon of this.skillSlots) {
      if (!weapon || weapon.category !== 'weapon' || !weapon.isFired) continue;
      
      // 무기와 적 충돌 검사 (히트박스 기반)
      if (Enemy && Enemy.activeEnemies) {
        const stats = GameState.playerStats;
        const weaponHitbox = CollisionSystem.getHitbox(weapon, 'playerAttack');
        
        for (const enemy of Enemy.activeEnemies) {
          if (!enemy.active || enemy.isDead) continue;
          
          // 적별 히트 쿨타임 체크 (같은 적을 연속으로 타격하지 않도록)
          if (weapon.hitCooldowns && weapon.hitCooldowns.has(enemy)) {
            const cooldown = weapon.hitCooldowns.get(enemy);
            if (cooldown > 0) continue; // 쿨타임이 남아있으면 스킵
          }
          
          // 히트박스 기반 충돌 검사
          const enemyHitbox = CollisionSystem.getHitbox(enemy, 'enemy');
          
          if (CollisionSystem.checkAABB(
            weaponHitbox.x, weaponHitbox.y, weaponHitbox.w, weaponHitbox.h,
            enemyHitbox.x, enemyHitbox.y, enemyHitbox.w, enemyHitbox.h
          )) {
            const isCrit = Math.random() < stats.critRate;
            const damage = isCrit ? stats.attack * stats.critDamage : stats.attack;
            
            // 적별 히트 쿨타임 설정 (0.1초, 같은 적을 연속으로 타격하지 않도록)
            if (!weapon.hitCooldowns) {
              weapon.hitCooldowns = new Map();
            }
            weapon.hitCooldowns.set(enemy, 0.1);
            
            enemy.hp -= damage;
            
            // 피격 틴트 및 강한 흔들림
            if (enemy) {
              enemy.isTinted = true;
              enemy.tintTimer = 0.25;
              enemy.hitShakeTimer = enemy.hitShakeDuration || 0.25;
            }
            
            // 넉백 적용
            if (weapon.knockback > 0) {
              const dx = enemy.x - weapon.x;
              const dy = enemy.y - weapon.y;
              const distSq = dx * dx + dy * dy;
              if (distSq > 0) {
                const dist = Math.sqrt(distSq);
                const knockbackDist = weapon.knockback * 10;
                enemy.x += (dx / dist) * knockbackDist;
                enemy.y += (dy / dist) * knockbackDist;
                
                const bounds = MapSystem.checkBounds(enemy.x, enemy.y, enemy.width, enemy.height);
                enemy.x = bounds.x;
                enemy.y = bounds.y;
              }
            }
            
            // 적 사망 처리
            if (enemy.hp <= 0) {
              GameState.addExp(enemy.exp);
              GameState.addGold(enemy.gold);
              if (GameState && typeof GameState.onEnemyKilled === 'function') {
                GameState.onEnemyKilled();
              }
              
              if (Camera && GameSettings && GameSettings.screenShake) {
                Camera.shake(8, 0.2);
              }
              
              Enemy.despawn(enemy);
            }
            
            // 무기는 타겟에 도달할 때까지 계속 이동 (충돌 시 즉시 리셋하지 않음)
            // 대신 타겟이 사라졌을 때만 리셋
            if (weapon.targetEnemy === enemy && enemy.hp <= 0) {
              weapon.targetEnemy = null;
            }
            break; // 한 번에 하나의 적만 타격
          }
        }
      }
      
      // 무기와 보스 충돌 검사 (모든 활성 보스, 히트박스 기반)
      if (BossSystem && BossSystem.activeBosses) {
        const stats = GameState.playerStats;
        const weaponHitbox = CollisionSystem.getHitbox(weapon, 'playerAttack');
        
        for (const boss of BossSystem.activeBosses) {
          if (!boss || boss.hp <= 0) continue;
          
          // 보스 공격 가능 여부 확인 (MESSIAH.js의 함수 사용)
          if (typeof canBossBeAttacked === 'function' && !canBossBeAttacked(boss)) continue;
          
          // 히트박스 기반 충돌 검사
          const bossHitbox = CollisionSystem.getHitbox(boss, 'boss');
          
          if (CollisionSystem.checkAABB(
            weaponHitbox.x, weaponHitbox.y, weaponHitbox.w, weaponHitbox.h,
            bossHitbox.x, bossHitbox.y, bossHitbox.w, bossHitbox.h
          ) && boss.weaponHitCooldown <= 0) {
            const isCrit = Math.random() < stats.critRate;
            const damage = isCrit ? stats.attack * stats.critDamage : stats.attack;
            
            boss.hp -= damage;
            boss.weaponHitCooldown = 0.1;
            
            if (boss.hp <= 0) {
              GameState.addExp(boss.exp);
              GameState.addGold(boss.gold);

              // 미카엘 처치 시 엔트로피 획득
              if (boss.name === 'michael') {
                GameState.entropy = (GameState.entropy || 0) + 10;
              }

              // 미카엘 사망 사운드 (중복 방지)
              if (boss.name === 'michael' && !boss.playedDeathSound) {
                boss.playedDeathSound = true;
                
                // BGM 페이드아웃
                if (typeof window !== 'undefined' && window.stopBgmWithFade) {
                  try {
                    window.stopBgmWithFade(0.8);
                  } catch (e) {
                    console.warn('[Audio] BGM 페이드아웃 실패', e);
                  }
                }
                
                // 사망 사운드 재생
                setTimeout(() => {
                  try {
                    const audioEl = ResourceLoader && ResourceLoader.getAudio
                      ? ResourceLoader.getAudio('audio/michael_dead.mp3')
                      : null;
                    const sfx = audioEl ? audioEl.cloneNode() : new Audio('audio/michael_dead.mp3');
                    sfx.volume = (GameSettings && GameSettings.sfxVolume ? GameSettings.sfxVolume * 0.01 : 0.7);
                    sfx.play().catch(e => console.warn('[Audio] 미카엘 사망 사운드 재생 실패', e));
                  } catch (e) {
                    console.warn('[Audio] 미카엘 사망 사운드 로드 실패', e);
                  }
                }, 800); // 페이드아웃 후 재생
              }
              
              if (Camera && GameSettings && GameSettings.screenShake) {
                Camera.shake(15, 0.3);
              }
              
              // 보스 사망 상태 설정 및 이미지 변경
              boss.isDead = true;
              
              // 보스 처치 시 클리어 시퀀스 시작
              if (Player && !Player.isClearing) {
                Player.startClearSequence();
              }
              
              // despawn은 클리어 시퀀스 후에 처리
              if (WaveSystem && GameState.currentStage !== 99) {
                WaveSystem.endWave();
              }
            }
            
            // 무기는 타겟에 도달할 때까지 계속 이동 (충돌 시 즉시 리셋하지 않음)
            // 대신 타겟이 사라졌을 때만 리셋
            if (weapon.targetEnemy === boss && boss.hp <= 0) {
              weapon.targetEnemy = null;
            }
            break; // 한 번에 하나의 타겟만 타격
          }
        }
      }
    }
  },
  
  /**
   * 무기 렌더링
   */
  renderWeapons(ctx) {
    if (!Player) return;
    
    // 사망 애니메이션 중이거나 사망 대기 중이면 무기 렌더링하지 않음
    if (Player.isDying || (Player.isDead && !Player.isReviving)) {
      return;
    }
    
    for (const weapon of this.skillSlots) {
      if (!weapon || weapon.category !== 'weapon') continue;
      
      ctx.save();
      
      // 무기 방향 계산 (칼끝이 적을 향하도록)
      let angle = 0;
      if (weapon.isFired) {
        // 발사 중: 목표 방향 (칼끝이 목표를 향하도록)
        const dx = weapon.targetX - weapon.x;
        const dy = weapon.targetY - weapon.y;
        angle = Math.atan2(dy, dx) + Math.PI / 2; // 이미지가 위를 향하고 있으므로 +90도 보정 (180도 반전)
      } else {
        // 대기 중: 가장 가까운 타겟 방향 (적 또는 보스, 범위 무관)
        let nearestTarget = null;
        let nearestDist = Infinity;
        
        // 보스 검사 (보스를 우선시, 범위 체크 없이)
        if (BossSystem && BossSystem.currentBoss) {
          const boss = BossSystem.currentBoss;
          const bossTargetable = boss.name === 'michael' ? boss.useMoveImage : true;
          if (boss.hp > 0 && bossTargetable) {
            const dx = boss.x - weapon.baseX;
            const dy = boss.y - weapon.baseY;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < nearestDist) {
              nearestDist = distSq;
              nearestTarget = boss;
            }
          }
        }
        
        // 적 검사 (범위 체크 없이, 보스가 없거나 보스보다 가까운 적이 있을 때)
        if (Enemy && Enemy.activeEnemies && Enemy.activeEnemies.length > 0) {
          for (const enemy of Enemy.activeEnemies) {
            if (!enemy.active || enemy.isDead) continue;
            
            const dx = enemy.x - weapon.baseX;
            const dy = enemy.y - weapon.baseY;
            const distSq = dx * dx + dy * dy;
            
            // 범위 체크 없이 가장 가까운 적 선택
            if (distSq < nearestDist) {
              nearestDist = distSq;
              nearestTarget = enemy;
            }
          }
        }
        
        if (nearestTarget) {
          const dx = nearestTarget.x - weapon.baseX;
          const dy = nearestTarget.y - weapon.baseY;
          angle = Math.atan2(dy, dx) + Math.PI / 2; // 이미지가 위를 향하고 있으므로 +90도 보정 (180도 반전)
        } else {
          // 타겟이 없으면 기본 방향 (위쪽)
          angle = 0; // 이미지가 기본적으로 위를 향하고 있음
        }
      }
      
      // 무기 위치로 이동 및 회전
      ctx.translate(weapon.x, weapon.y);
      ctx.rotate(angle);
      
      // 기요틴 회전 효과 (발사 중일 때만)
      if (weapon.specialEffect === 'rotating' && weapon.isFired) {
        ctx.rotate(weapon.rotationAngle);
      }
      
      // 무기 이미지가 있으면 이미지로 그리기
      if (weapon.image) {
        const imgWidth = 64; // 2배 크기
        const imgHeight = 64; // 2배 크기
        ctx.drawImage(
          weapon.image,
          -imgWidth / 2,
          -imgHeight / 2,
          imgWidth,
          imgHeight
        );
      } else {
        // 이미지가 없으면 원형으로 표시
        ctx.fillStyle = weapon.id === 'seraphic-edge' ? '#ffd700' : '#ff6b6b';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2); // 크기 2배
        ctx.fill();
        
        // 외곽선
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.restore();
    }
  }
};
