/**
 * SettlementSystem.js - 정산 시스템 모듈
 * 웨이브 종료 후 정산 및 스킬포인트 업그레이드 관리
 */

const SettlementSystem = {
  // 현재 정산 상태
  isActive: false,
  currentUpgradeChoices: [], // 현재 업그레이드 선택지 (3개)
  selectedUpgrade: null, // 선택된 업그레이드
  refreshCount: 0, // 현재 정산에서 초기화 횟수
  baseRefreshCost: 5, // 기본 초기화 비용 (5부터 시작)
  
  // 업그레이드 타입 목록
  upgradeTypes: [
    { key: 'maxHp', name: '체력', desc: '최대 체력 +20', value: 20 },
    { key: 'hpRegen', name: '체력 재생', desc: '초당 체력 재생 +0.5', value: 0.5 },
    { key: 'defense', name: '방어력', desc: '방어력 +2', value: 2 },
    { key: 'attack', name: '공격력', desc: '공격력 +5', value: 5 },
    { key: 'attackSpeed', name: '공격 속도', desc: '공격 속도 +0.2', value: 0.2 },
    { key: 'critRate', name: '치명타율', desc: '치명타율 +5%', value: 0.05 },
    { key: 'critDamage', name: '치명타 데미지', desc: '치명타 데미지 +1%', value: 0.01 },
    { key: 'moveSpeed', name: '이동 속도', desc: '이동 속도 +10', value: 10 },
    { key: 'luck', name: '행운', desc: '금화 획득 +10%', value: 0.1 },
    { key: 'mastery', name: '숙련도', desc: 'EXP 획득 +10%', value: 0.1 }
  ],
  
  /**
   * 초기화
   */
  init() {
    this.isActive = false;
    this.currentUpgradeChoices = [];
    this.selectedUpgrade = null;
    this.refreshCount = 0;
  },
  
  /**
   * 정산 시작
   */
  startSettlement() {
    // 게임 화면이 아니면 정산을 시작하지 않음
    if (GameState.currentScreen !== 'game') {
      console.log('[SettlementSystem] 게임 화면이 아니어서 정산을 시작하지 않습니다.');
      return;
    }
    
    // 스테이지 시작 시 정산을 시작하지 않도록 체크 (웨이브가 한 번도 시작되지 않은 경우)
    if (WaveSystem && WaveSystem.currentWave === 1 && WaveSystem.waveTimer === 0) {
      console.log('[SettlementSystem] 스테이지 시작 시 정산을 시작하지 않습니다.');
      return;
    }
    
    this.isActive = true;
    this.refreshCount = 0; // 정산 시작 시 초기화 횟수 리셋
    this.selectedUpgrade = null;
    
    // 스킬포인트가 0이면 바로 무기 선택으로
    if (GameState.skillPoints === 0) {
      this.showSkillSelection();
      return;
    }
    
    // 스킬포인트가 있으면 업그레이드 선택지 생성
    this.generateUpgradeChoices();
    this.showSettlementScreen();
  },
  
  /**
   * 업그레이드 선택지 생성 (랜덤 3개)
   */
  generateUpgradeChoices() {
    // 사용 가능한 업그레이드 타입 중 랜덤 3개 선택
    const available = [...this.upgradeTypes];
    const choices = [];
    
    for (let i = 0; i < 3 && available.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      choices.push(available[randomIndex]);
      available.splice(randomIndex, 1);
    }
    
    this.currentUpgradeChoices = choices;
  },
  
  /**
   * 업그레이드 선택
   */
  selectUpgrade(upgradeKey) {
    if (GameState.skillPoints <= 0) return;
    
    this.selectedUpgrade = upgradeKey;
    this.applyUpgrade(upgradeKey);
    GameState.skillPoints--;
    
    // 스킬포인트 사용 시 스킬 선택지 즉시 초기화
    this.selectedUpgrade = null;
    this.generateUpgradeChoices();
    
    // UI 업데이트
    this.updateSettlementUI();
    
    // 스킬포인트가 0이 되면 즉시 무기 선택으로 전환
    if (GameState.skillPoints === 0) {
      this.showSkillSelection();
    }
  },
  
  /**
   * 업그레이드 적용
   */
  applyUpgrade(upgradeKey) {
    const upgrade = this.upgradeTypes.find(u => u.key === upgradeKey);
    if (!upgrade) return;
    
    // 플레이어 통계에 즉시 적용
    if (upgradeKey === 'maxHp') {
      GameState.applyBonusStat('maxHp', upgrade.value);
    } else if (upgradeKey === 'hpRegen') {
      GameState.applyBonusStat('hpRegen', upgrade.value);
    } else if (upgradeKey === 'defense') {
      GameState.applyBonusStat('defense', upgrade.value);
    } else if (upgradeKey === 'attack') {
      GameState.applyBonusStat('attack', upgrade.value);
    } else if (upgradeKey === 'attackSpeed') {
      GameState.applyBonusStat('attackSpeed', upgrade.value);
    } else if (upgradeKey === 'critRate') {
      GameState.applyBonusStat('critRate', upgrade.value);
    } else if (upgradeKey === 'critDamage') {
      GameState.applyBonusStat('critDamage', upgrade.value);
    } else if (upgradeKey === 'moveSpeed') {
      GameState.applyBonusStat('moveSpeed', upgrade.value);
    } else if (upgradeKey === 'luck') {
      GameState.applyBonusStat('luck', upgrade.value);
    } else if (upgradeKey === 'mastery') {
      GameState.applyBonusStat('mastery', upgrade.value);
    }
  },
  
  /**
   * 업그레이드 선택지 초기화
   */
  refreshUpgradeChoices() {
    const cost = this.getRefreshCost();
    if (GameState.gold < cost) {
      alert(`금화가 부족합니다. 필요: ${cost} 금화`);
      return;
    }
    
    GameState.gold -= cost;
    this.refreshCount++;
    this.selectedUpgrade = null;
    this.generateUpgradeChoices();
    this.updateSettlementUI();
  },
  
  /**
   * 초기화 비용 계산
   */
  getRefreshCost() {
    return Math.floor(this.baseRefreshCost * Math.pow(1.5, this.refreshCount));
  },
  
  /**
   * 정산 화면 표시
   */
  showSettlementScreen() {
    showScreen('settlement');
    this.updateSettlementUI();
  },
  
  /**
   * 정산 UI 업데이트
   */
  updateSettlementUI() {
    // 스킬포인트 표시
    const skillPointsEl = document.getElementById('settlementSkillPoints');
    if (skillPointsEl) {
      skillPointsEl.textContent = GameState.skillPoints;
    }
    
    // 금화 표시
    const goldEl = document.getElementById('settlementGold');
    if (goldEl) {
      goldEl.textContent = GameState.gold;
    }
    
    // 업그레이드 선택지 표시
    const choicesEl = document.getElementById('upgradeChoices');
    if (choicesEl) {
      choicesEl.innerHTML = '';
      
      if (GameState.skillPoints > 0) {
        this.currentUpgradeChoices.forEach(upgrade => {
          const choiceEl = document.createElement('div');
          choiceEl.className = 'upgrade-choice';
          if (this.selectedUpgrade === upgrade.key) {
            choiceEl.classList.add('selected');
          }
          
          choiceEl.innerHTML = `
            <div class="upgrade-choice-name">${upgrade.name}</div>
            <div class="upgrade-choice-desc">${upgrade.desc}</div>
            <div class="upgrade-choice-cost">스킬포인트 1 소모</div>
          `;
          
          if (this.selectedUpgrade !== upgrade.key && GameState.skillPoints > 0) {
            choiceEl.addEventListener('click', () => {
              this.selectUpgrade(upgrade.key);
            });
          } else {
            choiceEl.classList.add('disabled');
          }
          
          choicesEl.appendChild(choiceEl);
        });
      }
    }
    
    // 계속하기 버튼 표시 (스킬포인트가 0일 때)
    const continueBtn = document.getElementById('continueBtn');
    if (continueBtn) {
      if (GameState.skillPoints === 0) {
        continueBtn.style.display = 'block';
      } else {
        continueBtn.style.display = 'none';
      }
    }
    
    // 무기 초기화 버튼 표시 (무기 선택 화면에서 사용)
    const refreshSkillsBtn = document.getElementById('refreshSkillsBtn');
    if (refreshSkillsBtn) {
      refreshSkillsBtn.style.display = 'none';
    }
    
    // 초기화 버튼 비용 표시
    const refreshBtn = document.getElementById('refreshUpgradesBtn');
    if (refreshBtn) {
      const cost = this.getRefreshCost();
      refreshBtn.textContent = `초기화 (${cost} 금화)`;
    }
  },
  
  /**
   * 무기 선택 화면으로 이동
   */
  showSkillSelection() {
    this.isActive = false;
    // 정산 화면을 먼저 숨기고 무기 선택 화면으로 전환
    showScreen('levelUp');
    SkillSystem.showSkillSelection();
  },
  
  /**
   * 정산 완료 (다음 웨이브로)
   */
  completeSettlement() {
    this.isActive = false;
    this.refreshCount = 0; // 다음 정산을 위해 초기화
    showScreen('game');
    
    // 다음 웨이브 시작
    if (WaveSystem) {
      WaveSystem.nextWave();
    }
  },
  
  /**
   * 무기 선택 완료 (다음 웨이브로)
   */
  completeSkillSelection() {
    this.isActive = false;
    this.refreshCount = 0; // 다음 정산을 위해 초기화
    showScreen('game');
    
    // 다음 웨이브 시작
    if (WaveSystem) {
      WaveSystem.nextWave();
    }
  }
};

