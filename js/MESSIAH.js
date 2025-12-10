/**
 * MESSIAH.js - 메인 게임 로직
 * 게임 루프, 화면 전환, 통합 관리
 */

// 브라우저 확장 프로그램 관련 오류 필터링
window.addEventListener('error', (event) => {
  // 확장 프로그램 관련 오류는 무시
  if (event.message && (
    event.message.includes('message channel closed') ||
    event.message.includes('asynchronous response') ||
    event.message.includes('Extension context invalidated')
  )) {
    event.preventDefault();
    return false;
  }
}, true);

// Promise rejection 오류 필터링 (확장 프로그램 관련)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason && typeof reason === 'object' && reason.message) {
    const message = reason.message;
    if (
      message.includes('message channel closed') ||
      message.includes('asynchronous response') ||
      message.includes('Extension context invalidated')
    ) {
      event.preventDefault();
      return false;
    }
  } else if (typeof reason === 'string') {
    if (
      reason.includes('message channel closed') ||
      reason.includes('asynchronous response') ||
      reason.includes('Extension context invalidated')
    ) {
      event.preventDefault();
      return false;
    }
  }
});

// --- 전역 변수 ---
let canvas = null;
let ctx = null;
let lastTime = 0;
let animationFrameId = null;
let currentBgm = null;
let bgmFadeInterval = null;
let titleBgmStarted = false; // 타이틀 BGM 재생 상태

/**
 * BGM 재생 (다른 BGM은 자동 정지)
 */
function playBgm(path, volume = 0.6) {
  try {
    // 진행 중인 페이드아웃 중단
    if (bgmFadeInterval) {
      clearInterval(bgmFadeInterval);
      bgmFadeInterval = null;
    }

    const audioEl = ResourceLoader && ResourceLoader.getAudio
      ? ResourceLoader.getAudio(path)
      : null;
    const audio = audioEl || new Audio(path);
    audio.loop = true;
    audio.volume = volume;
    
    // 이전 BGM 정지
    if (currentBgm && currentBgm !== audio) {
      currentBgm.pause();
      currentBgm.currentTime = 0;
    }
    
    currentBgm = audio;
    audio.play().catch(() => {});
  } catch (e) {
    // 무시
  }
}

/**
 * 현재 BGM을 페이드아웃 후 정지
 */
function stopBgmWithFade(duration = 0.8) {
  if (!currentBgm) return;

  // 이미 페이드 중이면 재시작
  if (bgmFadeInterval) {
    clearInterval(bgmFadeInterval);
    bgmFadeInterval = null;
  }

  const audio = currentBgm;
  const startVol = audio.volume;
  const steps = Math.max(1, Math.floor(duration / 0.05)); // 50ms 간격
  let step = 0;

  bgmFadeInterval = setInterval(() => {
    step += 1;
    const t = Math.min(1, step / steps);
    audio.volume = Math.max(0, startVol * (1 - t));

    if (t >= 1) {
      clearInterval(bgmFadeInterval);
      bgmFadeInterval = null;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = startVol; // 다음 재생 대비 원복
      if (currentBgm === audio) {
        currentBgm = null;
      }
    }
  }, 50);
}

// 전역 노출
if (typeof window !== 'undefined') {
  window.stopBgmWithFade = stopBgmWithFade;
}

// 무기 합체 모드 상태
let mergeMode = false;
let mergeSourceSlot = -1;

// 게임 일시정지 상태
let isGamePaused = false;

// 웨이브 클리어 애니메이션 상태
const WaveClearAnimation = {
  isActive: false,
  timer: 0,
  duration: 3.0, // 3초
  y: -200, // 시작 위치 (화면 위쪽 밖)
  targetY: 0, // 목표 위치 (화면 중앙)
  bounce: 0, // 바운스 효과
  waveNumber: 0
};

// 전역으로 노출 (WaveSystem에서 접근 가능하도록)
if (typeof window !== 'undefined') {
  window.WaveClearAnimation = WaveClearAnimation;
}

// 카메라 시스템
const Camera = {
  x: 0,
  y: 0,
  followSpeed: 0.15, // 카메라 추적 속도 (낮을수록 느리게)
  shakeOffsetX: 0, // 화면 흔들림 오프셋 X
  shakeOffsetY: 0, // 화면 흔들림 오프셋 Y
  shakeIntensity: 0, // 화면 흔들림 강도
  shakeDuration: 0, // 화면 흔들림 지속 시간
  
  /**
   * 카메라 업데이트 (플레이어 또는 말풍선 화자를 부드럽게 따라감)
   */
  update(dt) {
    if (!Player || !canvas) return;
    
    // 화면 흔들림 업데이트
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.shakeIntensity = 0;
      } else {
        // 랜덤 흔들림
        this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity;
        this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity;
      }
    }
    
    // 클리어 시퀀스 중 카메라 처리
    if (Player.isClearing && BossSystem && BossSystem.currentBoss) {
      const boss = BossSystem.currentBoss;
      const isMichael = boss.name === 'michael';
      const zoom = Player.clearZoom || 1.0;
      const zoomedWidth = canvas.width / zoom;
      const zoomedHeight = canvas.height / zoom;
      
      if (Player.clearPhase === 0) {
        // Phase 0: 카메라가 보스를 부드럽게 따라감
        // 보스를 화면 중앙에 위치시키기 위한 목표 위치
        let targetX = boss.x - zoomedWidth / 2;
        let targetY = boss.y - zoomedHeight / 2;
        
        // 맵 경계 체크
        const mapSize = MapSystem.mapSize;
        targetX = Math.max(0, Math.min(mapSize - zoomedWidth, targetX));
        targetY = Math.max(0, Math.min(mapSize - zoomedHeight, targetY));
        
        // 부드럽게 보스를 따라감
        const followSpeed = 0.15;
        this.x += (targetX - this.x) * followSpeed;
        this.y += (targetY - this.y) * followSpeed;
        
        // 카메라가 보스에 도달했는지 확인 (10픽셀 이내)
        const distSq = Math.pow(this.x - targetX, 2) + Math.pow(this.y - targetY, 2);
        if (distSq < 100) {
          Player.clearCameraReached = true;
        }
        return;
      } else {
        // Phase 1, 2, 3: 미카엘은 위치 그대로, 다른 보스는 중앙으로 이동
        let targetX, targetY;
        
        if (isMichael) {
          // 미카엘: 현재 위치 기준으로 카메라만 이동
          targetX = boss.x - zoomedWidth / 2;
          targetY = boss.y - zoomedHeight / 2;
        } else {
          // 다른 보스: 화면 중앙 기준으로 카메라 배치
          targetX = boss.x - zoomedWidth / 2;
          targetY = boss.y - zoomedHeight / 2;
        }
        
        // 맵 경계 체크
        const mapSize = MapSystem.mapSize;
        targetX = Math.max(0, Math.min(mapSize - zoomedWidth, targetX));
        targetY = Math.max(0, Math.min(mapSize - zoomedHeight, targetY));
        
        // 즉시 카메라 배치
        this.x = targetX;
        this.y = targetY;
        return;
      }
    }
    
    // 플레이어 사망 시 또는 사망 대기 중 플레이어를 화면 중앙에 두기
    if (Player.isDying || (Player.isDead && !Player.isReviving)) {
      // 줌을 고려한 화면 크기 계산
      const zoom = Player.cameraZoom || 1.0;
      const zoomedWidth = canvas.width / zoom;
      const zoomedHeight = canvas.height / zoom;
      
      // 플레이어를 화면 중앙에 위치시키기 위한 목표 위치
      let targetX = Player.x - zoomedWidth / 2;
      let targetY = Player.y - zoomedHeight / 2;
      
      // 맵 경계 체크 (카메라가 맵 밖으로 나가지 않도록)
      const minX = 0;
      const maxX = MapSystem.mapSize - zoomedWidth;
      const minY = 0;
      const maxY = MapSystem.mapSize - zoomedHeight;
      
      targetX = Math.max(minX, Math.min(maxX, targetX));
      targetY = Math.max(minY, Math.min(maxY, targetY));
      
    // 부드럽게 플레이어를 중앙으로 이동 (강제 위치 이동 없음)
    const followSpeed = this.followSpeed;
    this.x += (targetX - this.x) * followSpeed;
    this.y += (targetY - this.y) * followSpeed;
      return;
    }
    
    // 말풍선이 활성화되어 있으면 화자를 따라감, 아니면 플레이어를 따라감
    let target = Player;
    if (SpeechBubble && SpeechBubble.isActive() && SpeechBubble.currentBubble) {
      target = SpeechBubble.currentBubble.target;
    }
    
    // 타겟을 화면 중앙에 위치시키기 위한 목표 위치
    let targetX = target.x - canvas.width / 2;
    let targetY = target.y - canvas.height / 2;
    
    // 맵 경계 체크 (카메라가 맵 밖으로 나가지 않도록)
    const minX = 0;
    const maxX = MapSystem.mapSize - canvas.width;
    const minY = 0;
    const maxY = MapSystem.mapSize - canvas.height;
    
    targetX = Math.max(minX, Math.min(maxX, targetX));
    targetY = Math.max(minY, Math.min(maxY, targetY));
    
    // 부드러운 추적 (lerp)
    this.x += (targetX - this.x) * this.followSpeed;
    this.y += (targetY - this.y) * this.followSpeed;
  },
  
  /**
   * 화면 흔들림 효과 추가
   */
  shake(intensity = 5, duration = 0.2) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  },
  
  /**
   * 카메라 초기화
   */
  init() {
    if (!canvas) return;
    
    // 플레이어가 맵 중앙에 있을 때 카메라 위치 계산
    // 플레이 가능 영역 중앙에 카메라 배치
    const centerX = MapSystem.playableAreaSize / 2;
    const centerY = MapSystem.playableAreaSize / 2;
    this.x = Math.max(0, Math.min(MapSystem.mapSize - canvas.width, centerX - canvas.width / 2));
    this.y = Math.max(0, Math.min(MapSystem.mapSize - canvas.height, centerY - canvas.height / 2));
    
    // 화면 흔들림 초기화
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }
};

/**
 * 게임 초기화
 */
async function init() {
  // 캔버스 참조
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  // 캔버스 크기 설정 (창 높이에 맞춤)
  canvas.width = 1200;
  canvas.height = window.innerHeight;
  
  // 입력 시스템 초기화
  InputManager.init();
  
  // 게임 상태 초기화
  GameState.init();
  
  // 리소스 로딩 시작
  if (ResourceLoader) {
    await ResourceLoader.loadAll();
  }
  
  // 플레이어 초기화
  await Player.init();
  
  // UI 이벤트 바인딩
  setupUI();
  
  // 게임 루프 시작
  gameLoop(0);
  
  console.log('[MESSIAH] 게임 초기화 완료');
}

/**
 * UI 이벤트 설정
 */
// 옵션 설정 저장
const GameSettings = {
  bgmVolume: 50,
  sfxVolume: 50,
  screenShake: true
};

function setupUI() {
  // 타이틀 BGM 재생 함수 (사용자 상호작용 후)
  function startTitleBgm() {
    if (!titleBgmStarted) {
      titleBgmStarted = true;
      playBgm('audio/title.mp3', 0.6);
    }
  }
  
  // 타이틀 화면 클릭 시 BGM 재생
  const titleScreen = document.getElementById('titleScreen');
  if (titleScreen) {
    titleScreen.addEventListener('click', startTitleBgm, { once: true });
  }
  
  // 타이틀 화면 - 게임시작 버튼 클릭 시 다른 버튼들 표시
  let gameStartButtonClicked = false;
  document.getElementById('startBtn').addEventListener('click', () => {
    startTitleBgm();
    
    // 첫 클릭 시에만 버튼들 표시
    if (!gameStartButtonClicked) {
      gameStartButtonClicked = true;
      
      // 게임시작 버튼 텍스트를 "스테이지 선택"으로 변경
      const startBtn = document.getElementById('startBtn');
      if (startBtn) {
        startBtn.textContent = '스테이지 선택';
      }
      
      // 도움말과 옵션 버튼 표시
      const helpBtn = document.getElementById('helpBtn');
      const optionBtn = document.getElementById('optionBtn');
      
      if (helpBtn && helpBtn.style.display === 'none') {
        helpBtn.style.display = 'block';
        helpBtn.style.opacity = '0';
        helpBtn.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          helpBtn.style.opacity = '1';
        }, 10);
      }
      
      if (optionBtn && optionBtn.style.display === 'none') {
        optionBtn.style.display = 'block';
        optionBtn.style.opacity = '0';
        optionBtn.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          optionBtn.style.opacity = '1';
        }, 10);
      }
    } else {
      // 두 번째 클릭부터는 스테이지 선택 화면으로 이동
      showScreen('stageSelect');
      updateStageList();
    }
  });
  
  // 옵션 버튼
  document.getElementById('optionBtn')?.addEventListener('click', () => {
    startTitleBgm();
    showOptionScreen();
  });
  
  // 도움말 버튼
  document.getElementById('helpBtn')?.addEventListener('click', () => {
    startTitleBgm();
    showHelpScreen();
  });
  
  // 옵션 화면
  document.getElementById('closeOptionBtn')?.addEventListener('click', () => {
    document.getElementById('optionScreen').style.display = 'none';
  });
  
  // 도움말 화면
  document.getElementById('closeHelpBtn')?.addEventListener('click', () => {
    document.getElementById('helpScreen').style.display = 'none';
  });
  
  // 옵션 설정 이벤트
  const bgmVolume = document.getElementById('bgmVolume');
  const sfxVolume = document.getElementById('sfxVolume');
  const screenShakeToggle = document.getElementById('screenShakeToggle');
  
  if (bgmVolume) {
    bgmVolume.value = GameSettings.bgmVolume;
    bgmVolume.addEventListener('input', (e) => {
      GameSettings.bgmVolume = parseInt(e.target.value);
      document.getElementById('bgmVolumeValue').textContent = `${GameSettings.bgmVolume}%`;
    });
  }
  
  if (sfxVolume) {
    sfxVolume.value = GameSettings.sfxVolume;
    sfxVolume.addEventListener('input', (e) => {
      GameSettings.sfxVolume = parseInt(e.target.value);
      document.getElementById('sfxVolumeValue').textContent = `${GameSettings.sfxVolume}%`;
    });
  }
  
  if (screenShakeToggle) {
    screenShakeToggle.checked = GameSettings.screenShake;
    screenShakeToggle.addEventListener('change', (e) => {
      GameSettings.screenShake = e.target.checked;
      document.getElementById('screenShakeStatus').textContent = GameSettings.screenShake ? '켜짐' : '꺼짐';
    });
  }
  
  // 스테이지 선택 화면
  document.getElementById('upgradeBtn').addEventListener('click', () => {
    showScreen('upgrade');
    updateUpgradeList(); // 이 함수 내부에서 updateUpgradePlayerStats도 호출됨
  });
  
  document.getElementById('backToTitleBtn').addEventListener('click', () => {
    showScreen('title');
  });
  
  // 업그레이드 화면
  document.getElementById('backToStageBtn').addEventListener('click', () => {
    showScreen('stageSelect');
  });
  
  // 게임 메뉴 화면 (ESC)
  document.getElementById('resumeBtn')?.addEventListener('click', () => {
    closeGameMenu();
  });
  
  document.getElementById('toTitleFromMenuBtn')?.addEventListener('click', () => {
    closeGameMenu();
    showScreen('title');
  });
  
  // 게임 오버 화면
  // 다시 시작 버튼 숨기기 (타이틀 화면으로만 이동 가능)
  const restartBtn = document.getElementById('restartBtn');
  if (restartBtn) {
    restartBtn.style.display = 'none';
  }
  
  document.getElementById('toTitleBtn').addEventListener('click', () => {
    showScreen('title');
  });
  
  // 정산 화면 이벤트
  document.getElementById('continueBtn')?.addEventListener('click', () => {
    SettlementSystem.completeSettlement();
  });
  
  document.getElementById('refreshUpgradesBtn')?.addEventListener('click', () => {
    SettlementSystem.refreshUpgradeChoices();
  });
  
  // 무기 선택 화면 이벤트
  document.getElementById('refreshSkillChoicesBtn')?.addEventListener('click', () => {
    SkillSystem.refreshSkillChoices();
  });
  
  document.getElementById('startWaveBtn')?.addEventListener('click', () => {
    if (SettlementSystem) {
      SettlementSystem.completeSkillSelection();
    }
  });
  
  // 테스트 스테이지용 버튼 이벤트 - 무기별 추가
  const testWeaponButtons = [
    'seraphic-edge',
    'vorpal-sword',
    'durandal',
    'estoc',
    'morning-star',
    'guillotine',
    'longinus'
  ];
  testWeaponButtons.forEach(id => {
    document.getElementById(`testAddWeapon_${id}`)?.addEventListener('click', () => {
      if (!SkillSystem) return;
      const emptySlotIndex = SkillSystem.skillSlots.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        alert('무기 슬롯이 가득 찼습니다.');
        return;
      }
      SkillSystem.selectSkill(id, true); // 비용 무시
    });
  });
  
  document.getElementById('testAddReviveBtn')?.addEventListener('click', () => {
    if (Player) {
      Player.reviveCount++;
      console.log(`[테스트] 부활 횟수 추가: ${Player.reviveCount}`);
    }
  });
  
  document.getElementById('testAddDashBtn')?.addEventListener('click', () => {
    if (InputManager) {
      InputManager.maxDashCharges++;
      InputManager.dashCharges = Math.min(InputManager.dashCharges + 1, InputManager.maxDashCharges);
      console.log(`[테스트] 대쉬 횟수 추가: ${InputManager.dashCharges}/${InputManager.maxDashCharges}`);
    }
  });
  
  document.getElementById('testSpawnBossBtn')?.addEventListener('click', () => {
    if (BossSystem && MapSystem) {
      // 기존 보스 제거
      if (BossSystem.currentBoss) {
        BossSystem.despawn(BossSystem.currentBoss);
      }
      // 미카엘 보스 스폰 (맵 중앙)
      BossSystem.spawn('michael', 'angel', MapSystem.playableAreaSize / 2, MapSystem.playableAreaSize / 2);
      // 보스 웨이브로 설정
      if (WaveSystem) {
        WaveSystem.isBossWave = true;
      }
    }
  });
  
}

/**
 * 화면 전환
 */
function showScreen(screenName) {
  // 오버레이 화면은 제외 (gameMenuScreen은 ESC로만 제어)
  const screens = ['titleScreen', 'stageSelectScreen', 'upgradeScreen', 'gameScreen', 'levelUpScreen', 'gameOverScreen', 'settlementScreen'];
  
  screens.forEach(screen => {
    const element = document.getElementById(screen);
    if (element) {
      element.style.display = screen === `${screenName}Screen` ? 'flex' : 'none';
    }
  });
  
  GameState.setScreen(screenName);
  
  // 업그레이드 화면일 때 업그레이드 목록 및 플레이어 스탯 업데이트
  if (screenName === 'upgrade') {
    updateUpgradeList(); // 이 함수 내부에서 updateUpgradePlayerStats도 호출됨
  }
  
  // 게임 화면일 때 게임 루프 재시작
  if (screenName === 'game') {
    // 게임 BGM 시작 (다른 BGM 정지)
    playBgm('audio/game.mp3', 0.6);
    if (!animationFrameId) {
      gameLoop(0);
    }
  }
  // 타이틀 화면이면 타이틀 BGM 재생 (사용자 상호작용 후에만)
  if (screenName === 'title') {
    // 이미 사용자 상호작용이 있었으면 즉시 재생
    if (titleBgmStarted) {
      playBgm('audio/title.mp3', 0.6);
    }
  }
}

/**
 * 게임 메뉴 닫기
 */
function closeGameMenu() {
  const menuScreen = document.getElementById('gameMenuScreen');
  if (!menuScreen) return;
  
  menuScreen.style.display = 'none';
  isGamePaused = false;
  console.log('[MESSIAH] 게임 메뉴 닫기');
}

/**
 * 게임 메뉴 토글 (ESC)
 */
function toggleGameMenu() {
  const menuScreen = document.getElementById('gameMenuScreen');
  if (!menuScreen) {
    console.warn('[MESSIAH] gameMenuScreen 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 게임 화면이 아니면 메뉴를 열 수 없음
  if (GameState.currentScreen !== 'game') {
    console.log('[MESSIAH] 게임 화면이 아니어서 메뉴를 열 수 없습니다. currentScreen:', GameState.currentScreen);
    return;
  }
  
  // 현재 표시 상태 확인
  const computedStyle = window.getComputedStyle(menuScreen);
  const currentDisplay = menuScreen.style.display || computedStyle.display;
  const isVisible = currentDisplay === 'flex' || currentDisplay === 'block';
  
  if (isVisible) {
    closeGameMenu();
  } else {
    // 메뉴 열기
    menuScreen.style.display = 'flex';
    menuScreen.style.visibility = 'visible';
    menuScreen.style.opacity = '1';
    menuScreen.style.position = 'fixed';
    menuScreen.style.zIndex = '10000';
    menuScreen.style.top = '0';
    menuScreen.style.left = '0';
    menuScreen.style.width = '100vw';
    menuScreen.style.height = '100vh';
    isGamePaused = true;
    updateGameMenu(); // 메뉴 내용 업데이트
    console.log('[MESSIAH] 게임 메뉴 열기');
  }
}

/**
 * 게임 메뉴 내용 업데이트 (플레이어 스탯 및 무기 목록)
 */
function updateGameMenu() {
  const statsDisplay = document.getElementById('gameMenuStatsDisplay');
  const weaponsDisplay = document.getElementById('weaponsDisplay');
  
  if (!statsDisplay || !weaponsDisplay) return;
  
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
  
  // 플레이어 스탯 표시
  // 모든 스탯 반올림해 정수로 표시
  const statsHTML = [
    { label: '체력', value: `${Math.round(stats.hp)} / ${Math.round(stats.maxHp)}` },
    { label: '체력 재생', value: `${Math.round(stats.hpRegen)}/초` },
    { label: '방어력', value: `${Math.round(stats.defense)}` },
    { label: '공격력', value: `${Math.round(stats.attack)}` },
    { label: '공격 속도', value: `${Math.round(stats.attackSpeed)}/초` },
    { label: '치명타율', value: `${Math.round(stats.critRate * 100)}%` },
    { label: '치명타 데미지', value: `${Math.round(stats.critDamage * 100)}%` },
    { label: '이동 속도', value: `${Math.round(stats.moveSpeed)}` },
    { label: '행운', value: `${Math.round(stats.luck * 100)}%` },
    { label: '숙련도', value: `${Math.round(stats.mastery * 100)}%` },
    { label: '레벨', value: `${Math.round(GameState.level)}` },
    { label: 'EXP', value: `${Math.round(GameState.exp)} / ${Math.round(GameState.expToNext)}` }
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
  
  // 무기 목록 표시 (읽기 전용, 합체/판매 버튼 없음)
  if (typeof SkillSystem !== 'undefined') {
    weaponsDisplay.innerHTML = '';
    
    // 6개 슬롯 표시
    for (let i = 0; i < SkillSystem.maxSlots; i++) {
      const weapon = SkillSystem.skillSlots[i];
      const slotEl = document.createElement('div');
      slotEl.className = 'weapon-slot';
      
      if (weapon) {
        // 무기 스탯 정보 생성 (툴팁용 - 무기가 제공하는 보너스만 표시)
        const statsHtml = `
          <div class="weapon-stat-item">공격력 보너스: +${Math.round(weapon.damage)}</div>
          <div class="weapon-stat-item">치명타율 보너스: +${Math.round(weapon.critRate * 100)}%</div>
          <div class="weapon-stat-item">치명타 데미지 보너스: +${Math.round(weapon.critDamage * 100)}%</div>
          <div class="weapon-stat-item">쿨다운: ${Math.round(weapon.cooldown)}초</div>
          <div class="weapon-stat-item">넉백: ${Math.round(weapon.knockback)}</div>
          <div class="weapon-stat-item">범위: ${Math.round(weapon.range)}</div>
        `;
        
        // 무기가 있는 슬롯 (툴팁 포함)
        slotEl.innerHTML = `
          <div class="weapon-slot-content">
            <div class="weapon-slot-name">${weapon.name}</div>
            <div class="weapon-slot-grade">등급 ${weapon.grade}</div>
          </div>
          <div class="weapon-slot-tooltip">
            <div class="weapon-tooltip-title">${weapon.name}</div>
            ${statsHtml}
          </div>
        `;
        slotEl.classList.add('has-weapon');
        
        // 등급별 테두리 색상 적용
        if (weapon.grade >= 2) {
          slotEl.classList.add(`grade-${weapon.grade}`);
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
      
      weaponsDisplay.appendChild(slotEl);
      
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
  } else {
    weaponsDisplay.innerHTML = '<p>무기 시스템을 사용할 수 없습니다.</p>';
  }
}


// 전역 함수로 등록 (InputManager에서 호출)
if (typeof window !== 'undefined') {
  window.MESSIAH = {
    toggleGameMenu: toggleGameMenu
  };
}

/**
 * 스테이지 목록 업데이트
 */
function updateStageList() {
  const stageList = document.getElementById('stageList');
  stageList.innerHTML = '';
  
  // 스테이지 2 표시 및 초기 무기 선택
  const stageNumber = 2;
  const stageItem = document.createElement('div');
  stageItem.className = 'stage-item';
  
  // 사용 가능한 무기 목록
  const weaponOptions = SkillSystem.availableSkills
    .filter(skill => skill.category === 'weapon')
    .map(skill => ({
      id: skill.id,
      name: skill.name
    }));
  
  const stageInfo = MapSystem.stages[stageNumber];
  stageItem.innerHTML = `
    <h3>${stageInfo.name}</h3>
    <p>${stageInfo.desc || stageInfo.name}</p>
    <div style="margin: 15px 0;">
      <label style="display: block; margin-bottom: 8px; color: #fff; font-size: 0.9em;">초기 무기 선택</label>
      <select id="initialWeaponSelect" style="width: 100%; padding: 8px; background: #1a1a1a; color: #fff; border: 1px solid #444; border-radius: 4px; font-size: 0.9em; cursor: pointer;">
        ${weaponOptions.map(weapon => 
          `<option value="${weapon.id}" ${GameState.selectedInitialWeapon === weapon.id ? 'selected' : ''}>${weapon.name}</option>`
        ).join('')}
      </select>
    </div>
    <div class="stage-loading" style="display: none; margin-top: 10px;">
      <div style="width: 100%; height: 6px; background: #333; border-radius: 3px; overflow: hidden;">
        <div class="stage-loading-bar" style="width: 0%; height: 100%; background: #4a90e2; transition: width 0.3s;"></div>
      </div>
      <div class="stage-loading-text" style="margin-top: 5px; text-align: center; font-size: 0.9em; color: #888;">0%</div>
    </div>
  `;
  
  // 초기 무기 선택 변경 이벤트
  const weaponSelect = stageItem.querySelector('#initialWeaponSelect');
  if (weaponSelect) {
    // 선택 UI 클릭 시 카드 클릭 전파 방지 (게임 시작 방지)
    ['mousedown', 'mouseup', 'click'].forEach(evt => {
      weaponSelect.addEventListener(evt, (e) => e.stopPropagation());
    });
    weaponSelect.addEventListener('change', (e) => {
      GameState.selectedInitialWeapon = e.target.value;
    });
  }
  
  stageItem.addEventListener('click', async () => {
    // 선택된 무기 저장
    if (weaponSelect) {
      GameState.selectedInitialWeapon = weaponSelect.value;
    }
    await startGame(stageNumber, stageItem);
  });
  
  stageList.appendChild(stageItem);
  
  // 테스트 스테이지
  const testStageItem = document.createElement('div');
  testStageItem.className = 'stage-item';
  testStageItem.innerHTML = `
    <h3>${MapSystem.stages[99].name}</h3>
    <p>${MapSystem.stages[99].desc || '테스트 기능 전용'}</p>
    <div class="stage-loading" style="display: none; margin-top: 10px;">
      <div style="width: 100%; height: 6px; background: #333; border-radius: 3px; overflow: hidden;">
        <div class="stage-loading-bar" style="width: 0%; height: 100%; background: #4a90e2; transition: width 0.3s;"></div>
      </div>
      <div class="stage-loading-text" style="margin-top: 5px; text-align: center; font-size: 0.9em; color: #888;">0%</div>
    </div>
  `;
  
  testStageItem.addEventListener('click', async () => {
    await startGame(99, testStageItem);
  });
  
  stageList.appendChild(testStageItem);
}

/**
 * 업그레이드 목록 업데이트
 */
function updateUpgradeList() {
  const upgradeList = document.getElementById('upgradeList');
  const goldAmount = document.getElementById('goldAmount');
  
  goldAmount.textContent = GameState.entropy;
  upgradeList.innerHTML = '';
  
  // 업그레이드 최대 레벨 정의
  const maxLevels = {
    maxHp: Infinity,
    hpRegen: Infinity,
    defense: Infinity,
    attack: Infinity,
    attackSpeed: Infinity,
    critRate: Infinity,
    critDamage: Infinity,
    moveSpeed: Infinity,
    luck: Infinity,
    mastery: Infinity,
    reviveCount: 2,
    dashCharges: 1
  };
  
  const upgradeTypes = [
    { key: 'maxHp', name: '체력', desc: '최대 체력 +20' },
    { key: 'hpRegen', name: '체력 재생', desc: '초당 체력 재생 +0.5' },
    { key: 'defense', name: '방어력', desc: '방어력 +2' },
    { key: 'attack', name: '공격력', desc: '공격력 +5' },
    { key: 'attackSpeed', name: '공격 속도', desc: '공격 속도 +0.2' },
    { key: 'critRate', name: '치명타율', desc: '치명타율 +5%' },
    { key: 'critDamage', name: '치명타 데미지', desc: '치명타 데미지 +1%' },
    { key: 'moveSpeed', name: '이동 속도', desc: '이동 속도 +10' },
    { key: 'luck', name: '행운', desc: '금화 획득 +10%' },
    { key: 'mastery', name: '숙련도', desc: 'EXP 획득 +10%' },
    { key: 'reviveCount', name: '부활 횟수', desc: '부활 횟수 +1' },
    { key: 'dashCharges', name: '대쉬 2차지 해금', desc: '대쉬 충전 횟수 +1' }
  ];
  
  upgradeTypes.forEach(type => {
    const upgradeItem = document.createElement('div');
    upgradeItem.className = 'upgrade-item';
    
    const level = GameState.upgrades[type.key];
    const maxLevel = maxLevels[type.key];
    const cost = GameState.getUpgradeCost(type.key);
    const canAfford = GameState.entropy >= cost;
    
    // 최대 레벨 체크
    const isMaxLevel = level >= maxLevel;
    
    // 레벨 표시 형식: 최대 레벨이면 "MAX", 아니면 "Lv.현재레벨/최대레벨"
    let levelText;
    if (isMaxLevel) {
      levelText = 'MAX';
    } else if (maxLevel === Infinity) {
      levelText = `Lv.${level}`;
    } else {
      levelText = `Lv.${level}/${maxLevel}`;
    }
    
    if (!canAfford || isMaxLevel) {
      upgradeItem.classList.add('disabled');
    }
    
    upgradeItem.innerHTML = `
      <div class="upgrade-name">
        <div>${type.name}</div>
        <div class="upgrade-level">${levelText}</div>
      </div>
      <div class="upgrade-desc">${type.desc}</div>
      <div class="upgrade-cost">비용: ${cost} 엔트로피</div>
    `;
    
    if (canAfford && !isMaxLevel) {
      upgradeItem.addEventListener('click', () => {
        if (GameState.buyUpgrade(type.key)) {
          updateUpgradeList();
          updateUpgradePlayerStats();
        }
      });
    }
    
    upgradeList.appendChild(upgradeItem);
  });
  
  // 플레이어 스탯 업데이트
  updateUpgradePlayerStats();
}

/**
 * 업그레이드 화면 플레이어 스탯 표시
 */
function updateUpgradePlayerStats() {
  const statsDisplay = document.getElementById('playerStatsDisplay');
  if (!statsDisplay) return;
  
  const stats = GameState.playerStats;
  
  const statsHTML = [
    { label: '체력', value: `${Math.round(stats.hp)} / ${Math.round(stats.maxHp)}` },
    { label: '체력 재생', value: `${stats.hpRegen.toFixed(1)}/초` },
    { label: '방어력', value: `${Math.round(stats.defense)}` },
    { label: '공격력', value: `${Math.round(stats.attack)}` },
    { label: '공격 속도', value: `${stats.attackSpeed.toFixed(1)}/초` },
    { label: '치명타율', value: `${(stats.critRate * 100).toFixed(1)}%` },
    { label: '치명타 데미지', value: `${(stats.critDamage * 100).toFixed(0)}%` },
    { label: '이동 속도', value: `${Math.round(stats.moveSpeed)}` },
    { label: '행운', value: `${(stats.luck * 100).toFixed(0)}%` },
    { label: '숙련도', value: `${(stats.mastery * 100).toFixed(0)}%` },
    { label: '부활 횟수', value: `${GameState.upgrades.reviveCount}` },
    { label: '대쉬 차지', value: `${1 + GameState.upgrades.dashCharges}` }
  ];
  
  statsDisplay.innerHTML = '<h3 style="margin-top: 0; margin-bottom: 15px; color: #ffd700;">플레이어 스탯</h3>' +
    statsHTML.map(stat => `
      <div class="stat-item">
        <span class="stat-label">${stat.label}:</span>
        <span class="stat-value">${stat.value}</span>
      </div>
    `).join('');
}

/**
 * 게임 시작
 */
async function startGame(stageNumber, stageItemElement = null) {
  // 게임 오버 상태 초기화
  isGameOverHandled = false;
  
  // 스테이지 버튼 내부 로딩 진행사항 표시
  let stageLoadingDiv = null;
  let stageLoadingBar = null;
  let stageLoadingText = null;
  
  if (stageItemElement) {
    stageLoadingDiv = stageItemElement.querySelector('.stage-loading');
    stageLoadingBar = stageItemElement.querySelector('.stage-loading-bar');
    stageLoadingText = stageItemElement.querySelector('.stage-loading-text');
    
    if (stageLoadingDiv) {
      stageLoadingDiv.style.display = 'block';
      if (stageLoadingBar) stageLoadingBar.style.width = '0%';
      if (stageLoadingText) stageLoadingText.textContent = '0%';
    }
    
    // 버튼 비활성화
    stageItemElement.style.pointerEvents = 'none';
    stageItemElement.style.opacity = '0.7';
  }
  
  // 스테이지 진입 시 리소스 재로딩 (이미지/오디오)로 기본 이미지 노출 방지
  if (typeof ResourceLoader !== 'undefined') {
    try {
      // 로딩 진행사항을 스테이지 버튼에 표시하도록 콜백 설정
      const originalUpdateProgress = ResourceLoader.updateProgress;
      ResourceLoader.updateProgress = function() {
        originalUpdateProgress.call(this);
        // 스테이지 버튼의 로딩 진행사항도 업데이트
        if (stageLoadingBar && stageLoadingText) {
          const progress = Math.floor((this.loadedCount / this.totalCount) * 100);
          stageLoadingBar.style.width = `${progress}%`;
          stageLoadingText.textContent = `${progress}%`;
        }
      };
      
      await ResourceLoader.loadAll(); // 로딩 완료될 때까지 대기
      
      // 원래 함수로 복원
      ResourceLoader.updateProgress = originalUpdateProgress;
    } catch (e) {
      console.warn('[ResourceLoader] reload failed', e);
    }
  }
  
  // 로딩 완료 표시
  if (stageLoadingBar) stageLoadingBar.style.width = '100%';
  if (stageLoadingText) stageLoadingText.textContent = '100%';
  
  // 화면 갱신 여유 시간 후 진행
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 스테이지 버튼 로딩 영역 숨김 및 버튼 활성화
  if (stageItemElement) {
    if (stageLoadingDiv) {
      stageLoadingDiv.style.display = 'none';
    }
    stageItemElement.style.pointerEvents = 'auto';
    stageItemElement.style.opacity = '1';
  }
  
  // 스테이지 로드
  MapSystem.loadStage(stageNumber);
  MapSystem.loadMapImages();
  GameState.currentStage = stageNumber;
  
  
  // 플레이어 위치 초기화 (플레이 가능 영역 중앙)
  Player.x = MapSystem.playableAreaSize / 2;
  Player.y = MapSystem.playableAreaSize / 2;
  
  // 플레이어 상태/체력 초기화 (이전 게임오버 상태 유지 방지)
  if (Player) {
    Player.isDead = false;
    Player.isDying = false;
    Player.isReviving = false;
    Player.isClearing = false;
    Player.showJudgedText = false;
    Player.showQuestionMark = false;
    Player.questionMarkText = '';
    Player.questionMarkTimer = 0;
    Player.reviveWaitTimer = 0;
    Player.deathAnimationTimer = 0;
    Player.deathWaitTimer = 0;
    Player.reviveAnimationTimer = 0;
    Player.postReviveInvincibleTimer = 0;
    Player.isInvincible = false;
    Player.cameraZoom = 1.0;
    Player.clearZoom = 1.0;
    Player.clearSequenceTimer = 0;
    Player.clearPhase = 0;
    Player.clearCameraReached = false;
    Player.clearBossCentered = false;
    Player.clearZoomComplete = false;
    Player.showHuntedText = false;
    Player.huntedTextAnimationTimer = 0;
    Player.currentAnimation = 'idle';
    // 업그레이드된 부활 횟수 적용
    Player.reviveCount = GameState.upgrades.reviveCount;
    Player.currentFrame = 0;
    Player.animationTimer = 0;
  }
  
  // 체력 풀로 복구
  if (GameState && GameState.playerStats) {
    GameState.playerStats.hp = GameState.playerStats.maxHp;
  }
  
  // 카메라 초기화
  Camera.init();
  
  // 시스템 초기화
  if (CollisionSystem) CollisionSystem.init();
  if (Enemy) Enemy.init();
  if (BossSystem) BossSystem.init();
  if (SettlementSystem) SettlementSystem.init();
  if (SkillSystem) SkillSystem.init();
  if (SpeechBubble) SpeechBubble.init();
  
  // 업그레이드된 대쉬 차지 적용
  if (InputManager) {
    InputManager.maxDashCharges = 1 + GameState.upgrades.dashCharges;
    InputManager.dashCharges = InputManager.maxDashCharges;
  }
  
  // 게임 시작 시 엔트로피 저장 (획득 엔트로피 계산용)
  gameStartEntropy = GameState.entropy || 0;
  
  // 게임 상태 초기화
  GameState.resetPlayerStats();
  GameState.level = 1;
  GameState.exp = 0;
  GameState.expToNext = 100;
  GameState.wave = 1;
  GameState.skills = [];
  GameState.skillPoints = 0;
  GameState.gold = 0; // 스테이지 시작 시 금화 초기화
  
  // 테스트 스테이지일 때만 테스트 버튼 표시
  const testStageButtons = document.getElementById('testStageButtons');
  if (testStageButtons) {
    if (stageNumber === 99) {
      testStageButtons.style.display = 'flex';
    } else {
      testStageButtons.style.display = 'none';
    }
  }
  
  // 웨이브 시스템 초기화 (테스트 스테이지는 제외)
  if (WaveSystem && stageNumber !== 99) {
    WaveSystem.init();
    WaveSystem.updateMaxWave();
    WaveSystem.startWave(1);
  }
  
  // 화면 전환
  showScreen('game');
  
  
  console.log(`[MESSIAH] 스테이지 ${stageNumber} 시작`);
}

/**
 * 게임 루프
 */
function gameLoop(currentTime) {
  // 델타타임 계산
  const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0;
  lastTime = currentTime;
  
  // 게임 화면일 때만 업데이트 및 렌더링 (일시정지 상태가 아닐 때)
  if (GameState.currentScreen === 'game' && !isGamePaused) {
    update(deltaTime);
    render();
  } else if (GameState.currentScreen === 'game' && isGamePaused) {
    // 일시정지 중일 때는 렌더링만 (메뉴가 위에 표시됨)
    render();
  }
  
  animationFrameId = requestAnimationFrame(gameLoop);
}

/**
 * 게임 업데이트
 */
function update(dt) {
  // 입력 업데이트
  InputManager.update(dt);
  
  // 클리어 시퀀스 중이면 클리어 시퀀스만 업데이트
  if (Player.isClearing) {
    Player.update(dt);
    Camera.update(dt);
    return;
  }
  
  // 사망/부활 애니메이션 재생 중이거나 사망 대기 중이면 게임 로직 대기
  if (Player.isDying || (Player.isDead && !Player.isReviving) || Player.isReviving) {
    // 플레이어 애니메이션만 업데이트
    Player.update(dt);
    // 카메라 업데이트 (사망 시 플레이어를 중앙에 두기 위해)
    Camera.update(dt);
    // 카메라 줌은 render 함수에서 처리됨
    return;
  }
  
  // 플레이어 업데이트
  Player.update(dt);
  
  // 카메라 업데이트
  Camera.update(dt);
  
  // 체력 재생
  Player.regenerate(dt);
  
  // 충돌 시스템 업데이트 (그리드 재구성)
  CollisionSystem.update();
  
  // 투사체 업데이트
  Projectile.update(dt);
  
  // 적 시스템 업데이트
  Enemy.update(dt);
  
  // 플레이어 자동 공격
  Player.updateAutoAttack(dt);
  
  // 충돌 검사
  checkCollisions(dt);
  
  // 시스템 업데이트
  if (SkillSystem) {
    SkillSystem.checkWeaponCollisions();
    SkillSystem.update(dt);
  }
  
  // 말풍선 표시 중에는 적 생성 로직만 멈춤 (다른 게임 로직은 계속 진행)
  if (WaveSystem && GameState.currentStage !== 99) {
    if (!SpeechBubble || !SpeechBubble.isActive()) {
      WaveSystem.update(dt);
    }
  }
  
  if (BossSystem) {
    BossSystem.update(dt);
  }
  
  if (SpeechBubble) {
    SpeechBubble.update(dt);
  }
  
  // 말풍선 지연 표시 처리
  if (GameState.speechBubbleDelayTimer > 0) {
    GameState.speechBubbleDelayTimer -= dt;
    if (GameState.speechBubbleDelayTimer <= 0 && GameState.showSpeechBubble) {
      if (SpeechBubble && GameState.speechBubbleTarget && GameState.speechBubbleText) {
        SpeechBubble.show(GameState.speechBubbleTarget, GameState.speechBubbleText);
      }
      GameState.showSpeechBubble = false;
      GameState.speechBubbleText = '';
      GameState.speechBubbleTarget = null;
    }
  }
  
  // 스킬 선택 화면 지연 표시 처리
  if (GameState.skillSelectionDelayTimer > 0) {
    GameState.skillSelectionDelayTimer -= dt;
    if (GameState.skillSelectionDelayTimer <= 0 && GameState.showSkillSelection) {
      if (typeof SettlementSystem !== 'undefined') {
        SettlementSystem.showSkillSelection();
      }
      GameState.showSkillSelection = false;
    }
  }
  
  // 웨이브 클리어 애니메이션 업데이트
  if (WaveClearAnimation.isActive) {
    WaveClearAnimation.timer += dt;
    
    // 떨어지는 애니메이션 (0.5초 동안)
    if (WaveClearAnimation.timer < 0.5) {
      const progress = WaveClearAnimation.timer / 0.5;
      // ease-out 효과 (빠르게 시작해서 느리게 끝남)
      const eased = 1 - Math.pow(1 - progress, 3);
      WaveClearAnimation.y = -200 + (WaveClearAnimation.targetY + 200) * eased;
      
      // 바운스 효과
      if (progress > 0.8) {
        const bounceProgress = (progress - 0.8) / 0.2;
        WaveClearAnimation.bounce = Math.sin(bounceProgress * Math.PI * 2) * 20 * (1 - bounceProgress);
      }
    } else {
      // 목표 위치에 도달
      WaveClearAnimation.y = WaveClearAnimation.targetY;
      WaveClearAnimation.bounce = 0;
    }
    
    // 3초 후 정산 화면으로 전환
    if (WaveClearAnimation.timer >= WaveClearAnimation.duration) {
      WaveClearAnimation.isActive = false;
      if (typeof SettlementSystem !== 'undefined') {
        SettlementSystem.startSettlement();
      }
    }
  }
  
  // 플레이어 사망 체크는 Player.takeDamage에서 처리 (사망 애니메이션 시작)
  // 게임오버는 사망 애니메이션 종료 후 handleGameOver에서 처리
  
  // UI 업데이트
  updateGameUI();
}

/**
 * 게임 렌더링
 */
function render() {
  if (!canvas || !ctx) return;
  
  // 캔버스 초기화
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 카메라 변환 적용 (화면 흔들림 및 줌 포함)
  ctx.save();
  
  // 줌 적용 (사망 애니메이션 중, 사망 대기 중, 또는 클리어 시퀀스 중)
  const zoom = Player.isClearing ? Player.clearZoom : (Player.cameraZoom || 1.0);
  const isDeathState = Player.isDying || (Player.isDead && !Player.isReviving);
  const isClearState = Player.isClearing;
  if (zoom !== 1.0 && (isDeathState || isClearState)) {
    const screenCenterX = canvas.width / 2;
    const screenCenterY = canvas.height / 2;
    
    // 클리어 시퀀스 중이면 보스를 중심으로, 아니면 플레이어를 중심으로
    let targetScreenX, targetScreenY;
    if (isClearState && BossSystem && BossSystem.currentBoss) {
      // 보스의 스크린 좌표 (카메라 변환 후)
      targetScreenX = BossSystem.currentBoss.x - Camera.x;
      targetScreenY = BossSystem.currentBoss.y - Camera.y;
    } else {
      // 플레이어의 스크린 좌표 (카메라 변환 후)
      targetScreenX = Player.x - Camera.x;
      targetScreenY = Player.y - Camera.y;
    }
    
    // 화면 중앙을 기준으로 타겟 위치로 줌 적용
    ctx.translate(screenCenterX, screenCenterY);
    ctx.scale(zoom, zoom);
    ctx.translate(-targetScreenX, -targetScreenY);
    
    // 카메라 변환 적용
    ctx.translate(-Camera.x + Camera.shakeOffsetX, -Camera.y + Camera.shakeOffsetY);
  } else {
    // 일반 카메라 변환
    ctx.translate(-Camera.x + Camera.shakeOffsetX, -Camera.y + Camera.shakeOffsetY);
  }
  
  // 맵 렌더링
  MapSystem.render(ctx, Camera.x, Camera.y);
  
  // Quake 이펙트 렌더링 (적/보스/플레이어 뒤에 표시)
  if (BossSystem && BossSystem.renderQuakeEffects) {
    BossSystem.renderQuakeEffects(ctx);
  }
  
  // 적 렌더링
  if (Enemy) {
    Enemy.render(ctx);
  }
  
  // 보스 렌더링
  if (BossSystem) {
    BossSystem.render(ctx);
  }
  
  // 플레이어 렌더링
  Player.render(ctx);
  
  // 무기 렌더링 (사망 애니메이션 중이거나 사망 대기 중에는 비표시)
  if (SkillSystem && !Player.isDying && !(Player.isDead && !Player.isReviving)) {
    SkillSystem.renderWeapons(ctx);
  }
  
  // 말풍선 렌더링
  if (SpeechBubble) {
    SpeechBubble.render(ctx);
  }
  
  // 등장 표시 렌더링
  if (WaveSystem) {
    WaveSystem.renderMarkers(ctx);
  }
  
  // 히트박스 및 무기 범위 표시 (Shift 키 누를 때)
  if (InputManager.showHitboxes) {
    renderHitboxes(ctx);
  }
  
  // 카메라 변환 복원
  ctx.restore();
  
  // 웨이브 클리어 애니메이션 렌더링 (카메라 변환 후에 렌더링)
  if (WaveClearAnimation.isActive) {
    renderWaveClear(ctx);
  }
  
  // "JUDGED" 텍스트 렌더링 (사망 대기 중)
  if (Player.showJudgedText && Player.isDead && !Player.isReviving) {
    renderJudgedText(ctx);
  }
  
  // "HUNTED" 텍스트 렌더링 (클리어 시퀀스 중)
  if (Player.showHuntedText && Player.isClearing) {
    renderHuntedText(ctx);
  }
  
  // 게임 UI 렌더링 (레벨, 웨이브, 금화, 엔트로피)
  if (!Player.isDying && !(Player.isDead && !Player.isReviving)) {
    renderGameUI(ctx);
  }

}

/**
 * "HUNTED" 텍스트 렌더링 (JUDGED와 동일한 애니메이션)
 */
function renderHuntedText(ctx) {
  if (!canvas) return;
  
  const animationProgress = Math.min(1, Player.huntedTextAnimationTimer / Player.huntedTextAnimationDuration);
  
  let scale = 0;
  let alpha = 0;
  
  if (animationProgress < 0.2) {
    // 처음 20%: 매우 빠르게 확대 (쾅! 효과)
    const t = animationProgress / 0.2;
    const eased = 1 - Math.pow(1 - t, 3);
    scale = 1.5 * eased; // 최대 1.5배까지 확대
    alpha = eased;
  } else if (animationProgress < 0.4) {
    // 20-40%: 빠르게 축소 (바운스 효과)
    const t = (animationProgress - 0.2) / 0.2;
    const eased = 1 - Math.pow(1 - t, 2);
    scale = 1.5 - (0.5 * eased); // 1.5에서 1.0으로 축소
    alpha = 1.0;
  } else {
    // 40% 이후: 정상 크기 유지
    scale = 1.0;
    alpha = 1.0;
  }
  
  // 화면 중앙 좌표 (JUDGED 텍스트보다 더 높은 위치)
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 - 150; // 위로 150px 이동
  
  ctx.save();
  
  // 투명도 적용
  ctx.globalAlpha = alpha;
  
  // 텍스트 스타일 설정 (큰 글씨, 굵게, 빨간색, Sam3KR 폰트)
  ctx.font = 'bold 140px "Sam3KR", "Sam3KRFont", Arial, sans-serif';
  ctx.fillStyle = '#ff0000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 12; // 더 두꺼운 외곽선
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 스케일 적용
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  
  // 텍스트 그리기 (외곽선 + 채우기)
  ctx.strokeText('HUNTED', centerX, centerY);
  ctx.fillText('HUNTED', centerX, centerY);
  
  ctx.restore();
}

/**
 * "JUDGED" 텍스트 렌더링 (도장 찍듯이 나타나는 효과)
 */
function renderJudgedText(ctx) {
  if (!canvas) return;
  
  const animationProgress = Math.min(1, Player.judgedTextAnimationTimer / Player.judgedTextAnimationDuration);
  
  // 도장 찍듯이 나타나는 효과: 스케일과 페이드인 (더 강렬하게)
  // 시작: 스케일 0, 끝: 스케일 1.5 -> 1.0 (더 큰 바운스 효과)
  let scale = 0;
  let alpha = 0;
  
  if (animationProgress < 0.2) {
    // 처음 20%: 매우 빠르게 확대 (쾅! 효과)
    const t = animationProgress / 0.2;
    // 이징 함수: ease-out (빠르게 시작해서 느리게 끝남)
    const eased = 1 - Math.pow(1 - t, 3);
    scale = 1.5 * eased; // 최대 1.5배까지 확대
    alpha = eased;
  } else if (animationProgress < 0.4) {
    // 20-40%: 빠르게 축소 (바운스 효과)
    const t = (animationProgress - 0.2) / 0.2;
    const eased = 1 - Math.pow(1 - t, 2);
    scale = 1.5 - (0.5 * eased); // 1.5에서 1.0으로 축소
    alpha = 1.0;
  } else {
    // 40% 이후: 정상 크기 유지
    scale = 1.0;
    alpha = 1.0;
  }
  
  // 화면 중앙 좌표 (JUDGED 텍스트를 더 위에 표시)
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 - 100; // 위로 100px 이동
  
  ctx.save();
  
  // 투명도 적용
  ctx.globalAlpha = alpha;
  
  // 텍스트 스타일 설정 (큰 글씨, 굵게, 빨간색, Sam3KR 폰트)
  ctx.font = 'bold 140px "Sam3KR", "Sam3KRFont", Arial, sans-serif';
  ctx.fillStyle = '#ff0000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 12; // 더 두꺼운 외곽선
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 스케일 적용
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  
  // 텍스트 그리기 (외곽선 + 채우기)
  // 부활 시 "...?" 타이핑 효과를 JUDGED 뒤에 붙여서 표시
  let displayText = 'JUDGED';
  if (Player.showQuestionMark && Player.questionMarkText) {
    displayText = 'JUDGED' + Player.questionMarkText;
  }
  
  ctx.strokeText(displayText, centerX, centerY);
  ctx.fillText(displayText, centerX, centerY);
  
  ctx.restore();
}

/**
 * 웨이브 클리어 애니메이션 렌더링
 */
function renderWaveClear(ctx) {
  if (!canvas) return;
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const y = centerY + WaveClearAnimation.y + WaveClearAnimation.bounce;
  
  // 배경 (반투명 검은색)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 텍스트 스타일
  ctx.font = '80px "Sam3KR", "Sam3KRFont", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const text = 'STILL STANDING';
  
  // 그림자 효과
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillText(text, centerX + 4, y + 4);
  
  // 메인 텍스트 (금색)
  ctx.fillStyle = '#ffd700';
  ctx.fillText(text, centerX, y);
  
  // 추가 효과 (펄스)
  const pulse = Math.sin(WaveClearAnimation.timer * 3) * 0.1 + 1;
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3 * pulse;
  ctx.strokeText(text, centerX, y);
}

/**
 * 히트박스 및 무기 범위 표시
 */
function renderHitboxes(ctx) {
  // 플레이어 히트박스
  const playerHitbox = CollisionSystem.getHitbox(Player, 'player');
  ctx.strokeStyle = '#00ff00'; // 초록색
  ctx.lineWidth = 2;
  ctx.strokeRect(playerHitbox.x, playerHitbox.y, playerHitbox.w, playerHitbox.h);
  
  // 적 히트박스
  if (Enemy && Enemy.activeEnemies && Enemy.activeEnemies.length > 0) {
    ctx.strokeStyle = '#ff0000'; // 빨간색
    ctx.lineWidth = 2;
    for (const enemy of Enemy.activeEnemies) {
      if (!enemy.active || enemy.isDead) continue;
      const enemyHitbox = CollisionSystem.getHitbox(enemy, 'enemy');
      ctx.strokeRect(enemyHitbox.x, enemyHitbox.y, enemyHitbox.w, enemyHitbox.h);
    }
  }
  
  // 보스 히트박스
  if (BossSystem && BossSystem.currentBoss) {
    const boss = BossSystem.currentBoss;
    if (boss && boss.hp > 0) {
      ctx.strokeStyle = '#ff00ff'; // 자홍색
      ctx.lineWidth = 2;
      const bossHitbox = CollisionSystem.getHitbox(boss, 'boss');
      ctx.strokeRect(bossHitbox.x, bossHitbox.y, bossHitbox.w, bossHitbox.h);
    }
  }
  
  // 무기 범위 표시 (배경 타입에 따라 색상 변경)
  if (SkillSystem && SkillSystem.skillSlots) {
    // 배경 타입에 따라 색상 결정
    const backgroundType = MapSystem.getCurrentBackgroundType();
    ctx.strokeStyle = backgroundType === 'hell' ? '#00ffff' : '#000000'; // 지옥: 청록색, 천국: 검은색
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]); // 점선
    for (const weapon of SkillSystem.skillSlots) {
      if (!weapon || weapon.category !== 'weapon') continue;
      
      // 무기 위치에서 범위 원 그리기
      ctx.beginPath();
      ctx.arc(weapon.x, weapon.y, weapon.range, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]); // 점선 해제
  }
}

/**
 * 게임 UI 업데이트
 */
function updateGameUI() {
  // 사망 애니메이션 중이거나 사망 대기 중이면 모든 UI 비표시
  const isDeathState = Player.isDying || (Player.isDead && !Player.isReviving);
  const gameUI = document.querySelector('.game-ui');
  if (gameUI) {
    gameUI.style.display = isDeathState ? 'none' : 'block';
  }
  
  // 사망 상태면 UI 업데이트 중단
  if (isDeathState) {
    return;
  }
  
  // 보스 체력바 업데이트
  const bossHealthBar = document.getElementById('bossHealthBar');
  const bossNameText = document.getElementById('bossNameText');
  const bossHealthFill = document.getElementById('bossHealthFill');
  const bossHealthText = document.getElementById('bossHealthText');
  
  if (BossSystem && BossSystem.currentBoss) {
    const boss = BossSystem.currentBoss;
    if (bossHealthBar) {
      bossHealthBar.style.display = 'block';
    }
    if (bossNameText) {
      const bossData = BossSystem.bosses[boss.name];
      bossNameText.textContent = bossData ? bossData.name : boss.name;
    }
    if (bossHealthFill) {
      const hpPercent = (boss.hp / boss.maxHp) * 100;
      bossHealthFill.style.width = `${hpPercent}%`;
    }
    if (bossHealthText) {
      bossHealthText.textContent = `${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;
    }
  } else {
    if (bossHealthBar) {
      bossHealthBar.style.display = 'none';
    }
  }
}

/**
 * 게임 UI 캔버스 렌더링 (레벨, 웨이브, 금화, 엔트로피)
 */
function renderGameUI(ctx) {
  if (!canvas) return;
  
  const padding = 20;
  const fontSize = 18;
  const smallFontSize = 14;
  const lineHeight = 24;
  
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.textBaseline = 'top';
  
  // 웨이브 정보 (중상단)
  if (WaveSystem) {
    ctx.textAlign = 'center';
    const waveText = `웨이브 ${GameState.wave}`;
    const centerX = canvas.width / 2;
    const topY = padding;
    const waveFontSize = 28; // 웨이브 글자 크기 증가
    
    ctx.font = `bold ${waveFontSize}px Arial`;
    ctx.strokeText(waveText, centerX, topY);
    ctx.fillText(waveText, centerX, topY);
    
    // 마지막 웨이브가 아니면 초 표시
    if (GameState.wave < WaveSystem.maxWave) {
      const remainingTime = Math.max(0, WaveSystem.waveDuration - WaveSystem.waveTimer);
      const timerText = `${Math.ceil(remainingTime)}초`;
      const timerFontSize = 22; // 초 글자 크기 증가
      
      ctx.font = `bold ${timerFontSize}px Arial`;
      ctx.strokeText(timerText, centerX, topY + lineHeight + 5);
      ctx.fillText(timerText, centerX, topY + lineHeight + 5);
    }
  }
  
  // 레벨 및 EXP 게이지바 (좌측 상단)
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'left';
  let yPos = padding;
  
  const levelText = `Lv.${GameState.level}`;
  const expPercent = Math.max(0, Math.min(100, (GameState.exp / GameState.expToNext) * 100));
  const expText = `${GameState.exp}/${GameState.expToNext}`;
  
  // 레벨 텍스트
  ctx.strokeText(levelText, padding, yPos);
  ctx.fillText(levelText, padding, yPos);
  
  // EXP 게이지바 배경
  const gaugeX = padding;
  const gaugeY = yPos + lineHeight;
  const gaugeWidth = 300;
  const gaugeHeight = 20;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight);
  
  // EXP 게이지바 채우기
  const fillWidth = gaugeWidth * (expPercent / 100);
  const gradient = ctx.createLinearGradient(gaugeX, gaugeY, gaugeX + gaugeWidth, gaugeY);
  gradient.addColorStop(0, '#4a90e2');
  gradient.addColorStop(1, '#6bb3ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(gaugeX, gaugeY, fillWidth, gaugeHeight);
  
  // EXP 텍스트
  ctx.font = `${smallFontSize}px Arial`;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.strokeText(expText, gaugeX + gaugeWidth / 2, gaugeY + gaugeHeight / 2 - smallFontSize / 2);
  ctx.fillText(expText, gaugeX + gaugeWidth / 2, gaugeY + gaugeHeight / 2 - smallFontSize / 2);
  
  yPos = gaugeY + gaugeHeight + padding;
  
  // 금화 및 엔트로피
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'left';
  
  const goldText = `금화: ${GameState.gold}`;
  ctx.strokeText(goldText, padding, yPos);
  ctx.fillText(goldText, padding, yPos);
  
  yPos += lineHeight;
  
  const entropyText = `엔트로피: ${GameState.entropy}`;
  ctx.strokeText(entropyText, padding, yPos);
  ctx.fillText(entropyText, padding, yPos);
  
  ctx.restore();
}

/**
 * 레벨업 처리 (웨이브 중 레벨업 시 스킬포인트만 증가)
 */
function handleLevelUp() {
  // 레벨업은 GameState.addExp()에서 자동 처리됨
  // 스킬포인트는 GameState.levelUp()에서 자동 증가
  // 웨이브 중에는 스킬 선택 화면을 표시하지 않음
}

// 게임 오버 상태 추적
let isGameOverHandled = false;
// 게임 시작 시 엔트로피 저장 (획득 엔트로피 계산용)
let gameStartEntropy = 0;

/**
 * 게임 오버 처리
 */
function handleGameOver(message) {
  // 이미 게임 오버 처리가 되었으면 중복 호출 방지
  if (isGameOverHandled) return;
  
  // 사망/부활 애니메이션 중이면 게임오버 처리하지 않음
  if (Player.isDying || Player.isReviving) return;
  
  isGameOverHandled = true;
  
  // 획득 엔트로피와 도달 웨이브 정보 저장
  const currentEntropy = GameState.entropy || 0;
  const earnedEntropy = Math.max(0, currentEntropy - gameStartEntropy);
  const wave = WaveSystem ? WaveSystem.currentWave : GameState.wave || 1;
  
  // 게임오버 메시지에 획득 엔트로피와 도달 웨이브 표시
  const gameOverMessage = document.getElementById('gameOverMessage');
  if (gameOverMessage) {
    let messageText = '';
    if (message) {
      messageText += message + '<br><br>';
    }
    messageText += `획득 엔트로피: ${earnedEntropy}<br>`;
    messageText += `도달 웨이브: ${wave}`;
    gameOverMessage.innerHTML = messageText;
  }
  
  // 게임오버 화면 표시
  showScreen('gameOver');
  
  // 스테이지 종료 시 금화 초기화
  if (GameState) {
    GameState.gold = 0;
  }
}

/**
 * 게임 클리어 처리
 */
function handleGameClear() {
  // 보스 despawn (클리어 시퀀스 후)
  if (BossSystem && BossSystem.currentBoss) {
    BossSystem.despawn(BossSystem.currentBoss);
  }
  
  // 획득 재화와 도달 웨이브 정보 저장
  const gold = GameState.gold || 0;
  const wave = WaveSystem ? WaveSystem.currentWave : GameState.wave || 1;
  
  // 클리어 메시지에 획득 재화와 도달 웨이브 표시 (게임오버 화면과 동일하게)
  const gameOverMessage = document.getElementById('gameOverMessage');
  if (gameOverMessage) {
    let messageText = `획득 재화: ${gold}G<br>`;
    messageText += `도달 웨이브: ${wave}`;
    gameOverMessage.innerHTML = messageText;
  }
  
  // 게임오버 화면 표시 (클리어 화면과 통일)
  showScreen('gameOver');
  
  // 스테이지 종료 시 금화 초기화
  if (GameState) {
    GameState.gold = 0;
  }
}

/**
 * 보스가 공격 가능한 상태인지 확인
 */
function canBossBeAttacked(boss) {
  if (boss.name === 'michael') {
    return boss.useMoveImage && !boss.isDashImageActive && 
           !boss.isDiving && !boss.isHidden && 
           !boss.isDivingDown && boss.diveWaitTimer <= 0;
  }
  // 다른 보스의 경우: 기존 로직
  const isDivingUp = boss.isDiving && boss.currentSkill === 'diveAttackEnhanced' && 
                     boss.diveTimer > 0 && !boss.isHidden && !boss.isDivingDown && boss.diveWaitTimer <= 0;
  return !isDivingUp && !boss.isHidden;
}

// 전역으로 노출 (SkillSystem에서 사용)
if (typeof window !== 'undefined') {
  window.canBossBeAttacked = canBossBeAttacked;
}

/**
 * 충돌 검사 처리
 */
function checkCollisions(dt) {
  // 플레이어와 적 충돌 검사 (접촉 데미지 쿨타임 적용)
  const hitEnemy = CollisionSystem.checkPlayerEnemyCollision(Player, Enemy.activeEnemies);
  if (hitEnemy && !Player.isInvincible && hitEnemy.contactDamageCooldown <= 0) {
    const isDead = Player.takeDamage(hitEnemy.damage);
    if (isDead) {
      handleGameOver('플레이어가 사망했습니다.');
    }
    hitEnemy.contactDamageCooldown = 1.0;
  }
  
  // 플레이어 투사체와 적 충돌 검사
  const playerProjectiles = Projectile.activeProjectiles.filter(p => p.owner === 'player' && p.active);
  const hits = CollisionSystem.checkProjectileCollision(playerProjectiles, Enemy.activeEnemies, 'enemy');
  
  for (const hit of hits) {
    hit.target.hp -= hit.projectile.damage;
    
    // HP 게이지바 표시 (3초간)
    if (hit.target.hpBarTimer !== undefined) {
      hit.target.hpBarTimer = 3.0;
    }
    
    Projectile.despawn(hit.projectile);
    
    if (hit.target.hp <= 0) {
      GameState.addExp(hit.target.exp);
      GameState.addGold(hit.target.gold);
      
      if (GameSettings && GameSettings.screenShake) {
        Camera.shake(8, 0.2);
      }
      
      Enemy.despawn(hit.target);
    }
  }
  
  // 플레이어 투사체와 보스 충돌 검사
  if (BossSystem && BossSystem.activeBosses && playerProjectiles.length > 0) {
    const playerHitbox = CollisionSystem.getHitbox(Player, 'player');
    
    for (const boss of BossSystem.activeBosses) {
      if (!boss || boss.hp <= 0) continue;
      
      if (!canBossBeAttacked(boss)) continue;
      
      const bossHitbox = CollisionSystem.getHitbox(boss, 'boss');
      
      // 플레이어 투사체와 보스 충돌 검사
      for (const proj of playerProjectiles) {
        if (!proj.active) continue;
        
        const projHitbox = CollisionSystem.getHitbox(proj, 'projectile');
        
        if (CollisionSystem.checkAABB(
          bossHitbox.x, bossHitbox.y, bossHitbox.w, bossHitbox.h,
          projHitbox.x, projHitbox.y, projHitbox.w, projHitbox.h
        ) && boss.projectileHitCooldown <= 0) {
          boss.hp -= proj.damage;
          boss.projectileHitCooldown = 0.1;
          Projectile.despawn(proj);
          
          if (boss.hp <= 0) {
            GameState.addExp(boss.exp);
            GameState.addGold(boss.gold);
            
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
        }
      }
      
      // 플레이어와 보스 충돌 검사
      // 미카엘 대쉬 중일 때는 쿨타임을 짧게 설정하여 연속 데미지 가능
      const isMichaelDashing = boss.name === 'michael' && boss.isDashing;
      const cooldownCheck = isMichaelDashing ? boss.contactDamageCooldown <= 0.1 : boss.contactDamageCooldown <= 0;
      
      if (CollisionSystem.checkAABB(
        playerHitbox.x, playerHitbox.y, playerHitbox.w, playerHitbox.h,
        bossHitbox.x, bossHitbox.y, bossHitbox.w, bossHitbox.h
      ) && !Player.isInvincible && cooldownCheck) {
        // 미카엘 대쉬 중일 때 데미지 증가
        let damage = boss.damage;
        if (isMichaelDashing) {
          damage = boss.damage * 5; // 대쉬 중 데미지 5배 증가
        }
        const isDead = Player.takeDamage(damage);
        // 대쉬 중일 때는 쿨타임을 짧게 설정 (0.1초), 일반 상태는 1초
        boss.contactDamageCooldown = isMichaelDashing ? 0.1 : 1.0;
        if (isDead) {
          handleGameOver('플레이어가 사망했습니다.');
        }
      }
    }
  }
  
  // 적 투사체와 플레이어 충돌 검사
  const enemyProjectiles = Projectile.activeProjectiles.filter(p => p.owner === 'enemy' && p.active);
  if (enemyProjectiles.length > 0) {
    const playerHitbox = CollisionSystem.getHitbox(Player, 'player');
    
    for (const proj of enemyProjectiles) {
      const projHitbox = CollisionSystem.getHitbox(proj, 'projectile');
      
      if (CollisionSystem.checkAABB(
        playerHitbox.x, playerHitbox.y, playerHitbox.w, playerHitbox.h,
        projHitbox.x, projHitbox.y, projHitbox.w, projHitbox.h
      )) {
        if (!Player.isInvincible) {
          const isDead = Player.takeDamage(proj.damage);
          if (isDead) {
            handleGameOver('플레이어가 사망했습니다.');
          }
        }
        Projectile.despawn(proj);
      }
    }
  }
}

/**
 * 옵션 화면 표시
 */
function showOptionScreen() {
  const optionScreen = document.getElementById('optionScreen');
  if (optionScreen) {
    optionScreen.style.display = 'flex';
    
    // 현재 설정 반영
    const bgmVolume = document.getElementById('bgmVolume');
    const sfxVolume = document.getElementById('sfxVolume');
    const screenShakeToggle = document.getElementById('screenShakeToggle');
    const bgmVolumeValue = document.getElementById('bgmVolumeValue');
    const sfxVolumeValue = document.getElementById('sfxVolumeValue');
    const screenShakeStatus = document.getElementById('screenShakeStatus');
    
    if (bgmVolume) bgmVolume.value = GameSettings.bgmVolume;
    if (sfxVolume) sfxVolume.value = GameSettings.sfxVolume;
    if (screenShakeToggle) screenShakeToggle.checked = GameSettings.screenShake;
    if (bgmVolumeValue) bgmVolumeValue.textContent = `${GameSettings.bgmVolume}%`;
    if (sfxVolumeValue) sfxVolumeValue.textContent = `${GameSettings.sfxVolume}%`;
    if (screenShakeStatus) screenShakeStatus.textContent = GameSettings.screenShake ? '켜짐' : '꺼짐';
  }
}

/**
 * 도움말 화면 표시
 */
function showHelpScreen() {
  const helpScreen = document.getElementById('helpScreen');
  if (helpScreen) {
    helpScreen.style.display = 'flex';
  }
}

// 페이지 로드 시 초기화
window.addEventListener('load', init);

