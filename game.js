// 캔버스 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1024;  // 더 큰 화면 크기로 변경 (기존 960)
canvas.height = 768; // 더 큰 화면 크기로 변경 (기존 720)

// 이미지 로드 완료 카운터 초기화
let imagesLoaded = 0;
const totalImages = 14; // 플레이어 이미지 2개 + 타일셋 1개 + 장애물 이미지 10개 + 대시 이펙트 1개

// 애니메이션 설정
const FPS = 8; // 초당 프레임 수
const FRAME_INTERVAL = 1000 / FPS; // 프레임 간격 (밀리초)

// 타일셋 이미지 로드
const tilesetImage = new Image();
tilesetImage.src = 'assets/UI/tileset x2.png';

// 타일셋 설정
const tileset = {
    image: tilesetImage,
    loaded: false,
    // 오른쪽 위 2x2 타일의 정보 (초기값, 이미지 로드 후 정확한 계산 예정)
    tiles: [
        { x: 0, y: 0, width: 0, height: 0 },
        { x: 0, y: 0, width: 0, height: 0 },
        { x: 0, y: 0, width: 0, height: 0 },
        { x: 0, y: 0, width: 0, height: 0 }
    ],
    // 수동으로 지정한 정확한 타일 좌표 (이미지 분석 후 확인된 값)
    manualTiles: [
        { x: 272, y: 16, width: 16, height: 16 },  // 좌상단
        { x: 288, y: 16, width: 16, height: 16 },  // 우상단
        { x: 272, y: 32, width: 16, height: 16 },  // 좌하단
        { x: 288, y: 32, width: 16, height: 16 }   // 우하단
    ]
};

// 타일맵 설정
const tilemap = {
    tileSize: 32, // 표시될 타일 크기
    rows: 24,     // 타일맵 행 수 (더 큰 화면 높이에 맞게 조정)
    cols: 32,     // 타일맵 열 수 (더 큰 화면 너비에 맞게 조정)
    x: 0,         // 타일맵 시작 x 좌표
    y: 0,         // 타일맵 시작 y 좌표
    data: [],     // 사용할 타일 인덱스 (코드에서 생성)
    padding: 0    // 타일 간 간격
};

// 캐릭터 상태 변수
const character = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    speed: 3,
    dashSpeed: 12,        // 대시 속도
    dashCooldown: 1000,   // 대시 쿨다운 (밀리초)
    dashDuration: 150,    // 대시 지속 시간 (밀리초)
    lastDashTime: 0,      // 마지막 대시 시간
    isDashing: false,     // 현재 대시 중인지 여부
    dashDirection: { x: 0, y: 0 }, // 대시 방향
    dashStartPosition: { x: 0, y: 0 }, // 대시 시작 위치
    frameY: 0, // 스프라이트 시트에서 현재 프레임의 Y 위치 (세로 프레임)
    idleFrameY: 2, // 정지 상태일 때 사용할 프레임 (세 번째 프레임, 인덱스 2)
    moving: false,
    facingLeft: false,
    // 크기는 이미지 로드 후 설정됨
    width: 0,
    height: 0,
    // 프레임 정보
    totalFrames: 8,
    frameWidth: 24,  // 한 프레임의 너비: 24px
    frameHeight: 26, // 한 프레임의 높이: 26px
    // 정지 이미지 크기
    idleWidth: 0,
    idleHeight: 0,
    // 마지막 프레임 업데이트 시간
    lastFrameUpdateTime: 0,
    // 캐릭터 크기 조정 설정
    scale: 1.8 // 화면에 표시될 때 1.8배 확대 (기존 2.5에서 축소)
};

// 키 입력 상태
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

// 스프라이트 이미지 로드
const playerSprite = new Image();
playerSprite.src = 'assets/characters/move with FX.png';

// 정지 상태 이미지 로드
const playerIdleSprite = new Image();
playerIdleSprite.src = 'assets/characters/static idle.png';

// 마우스 위치 추적
const mouse = {
    x: 0,
    y: 0,
    isDown: false,     // 마우스 버튼이 눌려있는지 상태
    lastFireTime: 0    // 마지막 총알 발사 시간
};

// 총알 관련 설정
const bulletConfig = {
    speed: 10,         // 총알 속도
    size: 4,           // 총알 크기
    color: '#FFD700',  // 총알 색상 (금색)
    muzzleOffset: { x: 32, y: 27 }, // 총구 위치 (캐릭터 스프라이트 기준)
    fireRate: 500      // 발사 간격 (밀리초) - 0.5초
};

// 총알 객체 배열
const bullets = [];

// 장애물 관련 설정
const obstacleConfig = {
    minCount: 5,         // 최소 장애물 수
    maxCount: 8,         // 최대 장애물 수
    minDistance: 150,    // 장애물 간 최소 거리
    playerClearRadius: 200, // 플레이어 주변 장애물 안 생성 반경
    types: {
        // 유닛과 총알 모두 통과 불가능한 장애물
        solid: ['block1', 'block2', 'block3', 'block4'],
        // 유닛만 통과 불가, 총알은 통과 가능한 장애물
        bulletPassable: ['all1', 'all2', 'all3', 'all4', 'all5', 'all6']
    },
    size: 48,  // 기본 장애물 표시 크기(기존 64에서 축소)
    solidSize: 100, // block 계열 장애물 크기 - 더 크게 설정 (60에서 100으로 증가)
    bulletPassableSize: 48, // all 계열 장애물 크기 - 기존 크기 유지
    originalSizes: {}  // 각 장애물의 원본 크기 정보를 저장할 객체
};

// 장애물 배열
const obstacles = [];

// 장애물 이미지 로드
const obstacleImages = {
    // 유닛과 총알 모두 통과 불가
    block1: new Image(),
    block2: new Image(),
    block3: new Image(),
    block4: new Image(),
    // 유닛만 통과 불가
    all1: new Image(),
    all2: new Image(),
    all3: new Image(),
    all4: new Image(),
    all5: new Image(),
    all6: new Image()
};

// 장애물 이미지 경로 설정
obstacleImages.block1.src = 'assets/sprites/block1.png';
obstacleImages.block2.src = 'assets/sprites/block2.png';
obstacleImages.block3.src = 'assets/sprites/block3.png';
obstacleImages.block4.src = 'assets/sprites/block4.png';
obstacleImages.all1.src = 'assets/sprites/all1.png';
obstacleImages.all2.src = 'assets/sprites/all2.png';
obstacleImages.all3.src = 'assets/sprites/all3.png';
obstacleImages.all4.src = 'assets/sprites/all4.png';
obstacleImages.all5.src = 'assets/sprites/all5.png';
obstacleImages.all6.src = 'assets/sprites/all6.png';

// 대시 이펙트 관련 설정
const dashEffect = {
    image: new Image(),
    frameCount: 7,          // 프레임 수: 7개
    currentFrame: 0,
    frameWidth: 117,        // 각 프레임 너비: 117px
    frameHeight: 26,        // 각 프레임 높이: 26px
    frameDuration: 100,     // 프레임당 지속 시간 (100ms = 0.1초)
    active: false,
    position: { x: 0, y: 0 },
    direction: { x: 0, y: 0 },
    lastFrameUpdateTime: 0,
    scale: 1.5,             // 대시 이펙트 스케일 조정
    angle: 0,               // 회전 각도 (방향에 따라 계산)
    flipVertical: false     // 수직 뒤집기 여부
};

// 대시 이펙트 이미지 로드
dashEffect.image.src = 'assets/effects/dash_effect.png';

// 대시 이펙트 이미지 로드 완료 시 처리
dashEffect.image.onload = function() {
    console.log('대시 이펙트 이미지 로드 완료:', this.width, 'x', this.height);
    console.log(`대시 이펙트: ${dashEffect.frameCount}개 프레임, 각 ${dashEffect.frameWidth}x${dashEffect.frameHeight} 크기`);
    
    startGameIfAllImagesLoaded();
};

dashEffect.image.onerror = function() {
    console.error('대시 이펙트 이미지를 로드할 수 없습니다: ' + this.src);
    startGameIfAllImagesLoaded();
};

// 키 이벤트 리스너 수정 - 스페이스바 대시 추가
window.addEventListener('keydown', function(e) {
    let keyPressed = false; // 유효한 키가 눌렸는지 확인하는 플래그
    
    switch(e.key.toLowerCase()) {
        case 'w':
            keys.w = true;
            keyPressed = true;
            break;
        case 'a':
            keys.a = true;
            keyPressed = true;
            break;
        case 's':
            keys.s = true;
            keyPressed = true;
            break;
        case 'd':
            keys.d = true;
            keyPressed = true;
            break;
        // 스페이스바로 대시 실행
        case ' ':
            performDash();
            break;
    }
    
    // W, A, S, D 키가 눌렸을 때만 캐릭터를 움직임 상태로 설정
    if (keyPressed) {
        character.moving = true;
    }
});

// 키를 뗄 때 이벤트 리스너
window.addEventListener('keyup', function(e) {
    switch(e.key.toLowerCase()) {
        case 'w':
            keys.w = false;
            break;
        case 'a':
            keys.a = false;
            break;
        case 's':
            keys.s = false;
            break;
        case 'd':
            keys.d = false;
            break;
    }
    // 모든 키가 떼어졌는지 확인
    if (!keys.w && !keys.a && !keys.s && !keys.d) {
        character.moving = false;
    }
});

// 캐릭터 이동 함수 수정 - 대시 처리 추가
function moveCharacter() {
    let newX = character.x;
    let newY = character.y;
    
    if (character.isDashing) {
        // 대시 중일 때는 대시 방향과 속도로 이동
        newX += character.dashDirection.x * character.dashSpeed;
        newY += character.dashDirection.y * character.dashSpeed;
    } else {
        // 일반 이동
        if (keys.w && character.y > 0) {
            newY -= character.speed;
        }
        if (keys.s && character.y < canvas.height - character.height) {
            newY += character.speed;
        }
        if (keys.a && character.x > 0) {
            newX -= character.speed;
        }
        if (keys.d && character.x < canvas.width - character.width) {
            newX += character.speed;
        }
    }
    
    // 화면 경계 체크
    newX = Math.max(0, Math.min(canvas.width - character.width, newX));
    newY = Math.max(0, Math.min(canvas.height - character.height, newY));
    
    // 장애물 충돌 체크
    const newCharacterRect = {
        x: newX,
        y: newY,
        width: character.width,
        height: character.height
    };
    
    let canMove = true;
    
    // 모든 장애물과 충돌 체크
    for (const obstacle of obstacles) {
        if (checkCollision(newCharacterRect, obstacle)) {
            canMove = false;
            break;
        }
    }
    
    // 충돌이 없을 경우에만 이동
    if (canMove) {
        character.x = newX;
        character.y = newY;
    } else if (character.isDashing) {
        // 대시 중 충돌 시 대시 중단
        character.isDashing = false;
    }
}

// 애니메이션 프레임 업데이트
function handlePlayerFrame(timestamp) {
    // 마지막 프레임 업데이트 이후 경과한 시간 계산
    if (!character.lastFrameUpdateTime) {
        character.lastFrameUpdateTime = timestamp;
    }
    
    const elapsed = timestamp - character.lastFrameUpdateTime;
    
    // FPS에 맞춰 프레임 업데이트
    if (elapsed > FRAME_INTERVAL) {
        if (character.moving) {
            character.frameY = (character.frameY + 1) % character.totalFrames;
        } else {
            character.frameY = 0; // 움직이지 않을 때는 첫 프레임
        }
        
        // 마지막 업데이트 시간 갱신
        character.lastFrameUpdateTime = timestamp;
    }
}

// 타일맵 기능 활성화 플래그
const enableTilemap = true; // 타일맵 기능을 켜거나 끄려면 이 값을 변경
const debugMode = false; // 디버그 모드 비활성화하여 바로 게임 시작

// 타일맵 그리기 함수
function drawTilemap() {
    if (!tileset.loaded || !enableTilemap) return;
    
    // 바닥 타일맵 그리기
    let dataIndex = 0;
    for (let row = 0; row < tilemap.rows; row++) {
        for (let col = 0; col < tilemap.cols; col++) {
            const tileIndex = tilemap.data[dataIndex++]; // 현재 위치의 타일 인덱스
            const tile = tileset.tiles[tileIndex]; // 해당 인덱스의 타일 정보
            
            // 타일맵 위치 계산
            const x = tilemap.x + col * (tilemap.tileSize + tilemap.padding);
            const y = tilemap.y + row * (tilemap.tileSize + tilemap.padding);
            
            try {
                // 투명도 대신 다른 방식으로 타일 밝기 조정
                // 일반적인 타일 그리기로 원본 타일을 먼저 그림
                ctx.drawImage(
                    tileset.image,
                    tile.x, tile.y,  // 소스 이미지 좌상단 좌표
                    tile.width, tile.height,  // 소스 이미지 크기
                    x, y,  // 캔버스에 그릴 위치
                    tilemap.tileSize, tilemap.tileSize  // 캔버스에 그릴 크기
                );
                
                // 타일 위에 밝은 색상의 반투명 레이어를 적용하여 밝게 만듦
                ctx.fillStyle = 'rgba(200, 220, 255, 0.3)'; // 밝은 파란빛의 반투명 레이어
                ctx.fillRect(x, y, tilemap.tileSize, tilemap.tileSize);
                
            } catch (error) {
                console.error('타일 그리기 오류:', error, '타일 정보:', tile);
            }
        }
    }
}

// 타일셋 이미지 로드 완료 시 타일 좌표 계산
tilesetImage.onload = function() {
    console.log('타일셋 이미지 로드 완료:', tilesetImage.width, 'x', tilesetImage.height);
    tileset.loaded = true;
    
    // 수동으로 지정한 정확한 타일 좌표 사용
    tileset.tiles = tileset.manualTiles;
    
    // 디버깅용 정보 출력
    console.log('타일 정보 계산 완료:', tileset.tiles);
    
    // 타일맵 위치 계산 (게임 화면을 타일맵으로 꽉 채움)
    tilemap.x = 0;  // 화면 왼쪽부터 시작
    tilemap.y = 0;  // 화면 상단부터 시작
    
    // 타일맵 데이터 생성 (전체 화면을 타일로 채우기)
    generateTilemapData();
    
    // 타일맵 데이터 생성 함수
    function generateTilemapData() {
        // 타일맵 데이터 초기화
        tilemap.data = [];
        
        // 각 행과 열에 대해 타일 패턴 생성 (화면 전체를 채움)
        for (let row = 0; row < tilemap.rows; row++) {
            for (let col = 0; col < tilemap.cols; col++) {
                // 바둑판 패턴으로 타일 배치
                const patternType = (row + col) % 2;
                let tileIndex;
                
                // 패턴에 따라 다른 타일 선택
                if (row % 2 === 0) {
                    tileIndex = patternType === 0 ? 0 : 1;  // 첫째, 셋째 행: 0과 1 번갈아 배치
                } else {
                    tileIndex = patternType === 0 ? 2 : 3;  // 둘째, 넷째 행: 2와 3 번갈아 배치
                }
                
                tilemap.data.push(tileIndex);
            }
        }
        
        console.log('타일맵 데이터 생성 완료, 타일 개수:', tilemap.data.length);
    }
    
    // 디버깅 함수 - 추출된 타일 이미지 확인
    function debugDrawTile(tileIndex) {
        const tile = tileset.tiles[tileIndex];
        // 배경 표시 (타일 경계 구분용)
        ctx.fillStyle = '#333';
        ctx.fillRect(50 + tileIndex * 80, 50, 64, 64);
        
        // 디버깅용 이미지 그리기 (타일 위치 확인용)
        ctx.drawImage(
            tilesetImage,
            tile.x, tile.y, tile.width, tile.height,
            50 + tileIndex * 80, 50, 64, 64
        );
        
        // 타일 인덱스 표시
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`타일 ${tileIndex}`, 50 + tileIndex * 80, 40);
        
        // 좌표 정보 표시
        ctx.fillText(`x:${tile.x} y:${tile.y}`, 50 + tileIndex * 80, 130);
        ctx.fillText(`w:${tile.width} h:${tile.height}`, 50 + tileIndex * 80, 150);
    }
    
    // 디버깅 모드일 때만 실행
    if (debugMode) {
        console.log('디버그 모드: 타일 위치 시각화');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 전체 타일셋 이미지 표시
        ctx.drawImage(tilesetImage, canvas.width - imgWidth - 20, 20, imgWidth, imgHeight);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        
        // 추출 영역 표시 (수동으로 지정한 타일 영역)
        for (let i = 0; i < tileset.tiles.length; i++) {
            const tile = tileset.tiles[i];
            ctx.strokeRect(
                canvas.width - imgWidth - 20 + tile.x,
                20 + tile.y,
                tile.width,
                tile.height
            );
        }
        
        // 개별 타일 표시
        for (let i = 0; i < tileset.tiles.length; i++) {
            debugDrawTile(i);
        }
        
        // 샘플 타일맵 그리기 (미리보기)
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText('타일맵 미리보기:', 50, 200);
        
        // 4x4 타일맵 샘플
        const previewSize = 32;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const patternType = (row + col) % 2;
                let tileIndex = 0;
                
                if (row % 2 === 0) {
                    tileIndex = patternType === 0 ? 0 : 1;
                } else {
                    tileIndex = patternType === 0 ? 2 : 3;
                }
                
                const tile = tileset.tiles[tileIndex];
                ctx.drawImage(
                    tilesetImage,
                    tile.x, tile.y, tile.width, tile.height,
                    50 + col * previewSize, 220 + row * previewSize,
                    previewSize, previewSize
                );
            }
        }
        
        // 게임 시작 버튼
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(50, 360, 150, 40);
        ctx.fillStyle = 'white';
        ctx.fillText('게임 시작', 90, 385);
        
        // 마우스 클릭 이벤트 리스너 추가
        canvas.addEventListener('click', function(e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // 게임 시작 버튼 클릭 확인
            if (mouseX >= 50 && mouseX <= 200 && mouseY >= 360 && mouseY <= 400) {
                console.log('게임 시작 버튼 클릭');
                startGame();
            }
        });
        
        // 게임 시작 함수
        function startGame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            startGameIfAllImagesLoaded();
        }
        
        return; // 디버깅 모드에서는 여기서 종료
    }
    
    startGameIfAllImagesLoaded();
};

// 게임 렌더링 함수 수정 - 대시 이펙트 그리기 추가
function drawGame() {
    // 화면 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. 먼저 타일맵(바닥) 그리기
    drawTilemap();
    
    // 2. 총알 그리기 (캐릭터 뒤에 그려질 총알)
    drawBullets();
    
    // 3. 장애물 그리기
    drawObstacles();
    
    // 4. 대시 이펙트 그리기 (캐릭터 아래에)
    drawDashEffect();
    
    // 5. 캐릭터 그리기
    drawCharacter();
}

// 캐릭터 그리기 함수
function drawCharacter() {
    if (character.moving) {
        // 움직일 때: 스프라이트 시트 애니메이션
        if (character.facingLeft) {
            // 왼쪽을 볼 때는 이미지 좌우 반전
            ctx.save();
            ctx.scale(-1, 1);
            
            ctx.drawImage(
                playerSprite,
                0, // 소스의 x 위치 (항상 0, 1열만 있으므로)
                character.frameY * character.frameHeight, // 소스의 y 위치 (세로 프레임)
                character.frameWidth, // 소스의 너비 (한 프레임의 너비)
                character.frameHeight, // 소스의 높이 (한 프레임의 높이)
                -character.x - character.width, // 캔버스에 그릴 위치 x (반전 때문에 조정)
                character.y, // 캔버스에 그릴 위치 y
                character.width, // 캔버스에 그릴 너비
                character.height // 캔버스에 그릴 높이
            );
            
            ctx.restore();
        } else {
            // 오른쪽을 볼 때
            ctx.drawImage(
                playerSprite,
                0, // 소스의 x 위치 (항상 0, 1열만 있으므로)
                character.frameY * character.frameHeight, // 소스의 y 위치 (세로 프레임)
                character.frameWidth, // 소스의 너비 (한 프레임의 너비)
                character.frameHeight, // 소스의 높이 (한 프레임의 높이)
                character.x,
                character.y,
                character.width,
                character.height
            );
        }
    } else {
        // 정지 상태일 때: move with FX의 세 번째 프레임 사용
        if (character.facingLeft) {
            // 왼쪽을 볼 때
            ctx.save();
            ctx.scale(-1, 1);
            
            ctx.drawImage(
                playerSprite,
                0, // x 위치는 항상 0 (1열만 있으므로)
                character.idleFrameY * character.frameHeight, // 세 번째 프레임의 y 위치
                character.frameWidth,
                character.frameHeight,
                -character.x - character.width, // 위치 조정
                character.y,
                character.width,
                character.height
            );
            
            ctx.restore();
        } else {
            // 오른쪽을 볼 때
            ctx.drawImage(
                playerSprite,
                0, // x 위치는 항상 0 (1열만 있으므로)
                character.idleFrameY * character.frameHeight, // 세 번째 프레임의 y 위치
                character.frameWidth,
                character.frameHeight,
                character.x,
                character.y,
                character.width,
                character.height
            );
        }
    }
}

// 마우스 위치 업데이트
canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    
    // 마우스 위치에 따라 캐릭터 방향 업데이트
    updateCharacterDirection();
});

// 마우스 버튼 누르기 이벤트
canvas.addEventListener('mousedown', function(e) {
    // 좌클릭만 처리 (e.button === 0)
    if (e.button === 0) {
        mouse.isDown = true;
        // 발사 전에 캐릭터 방향 업데이트
        updateCharacterDirection();
        // 즉시 첫 발사
        fireBullet();
        // 첫 발사 시간 기록
        mouse.lastFireTime = Date.now();
    }
});

// 마우스 버튼 떼기 이벤트
canvas.addEventListener('mouseup', function(e) {
    if (e.button === 0) {
        mouse.isDown = false;
    }
});

// 마우스 캔버스 밖으로 이동 시
canvas.addEventListener('mouseleave', function() {
    mouse.isDown = false;
});

// 마우스 위치에 따라 캐릭터 방향 업데이트하는 함수
function updateCharacterDirection() {
    // 캐릭터 중심 위치 계산 (스프라이트의 중심점)
    const characterCenterX = character.x + character.width / 2;
    
    // 마우스가 캐릭터 중심보다 좌측에 있으면 왼쪽을 보고, 우측에 있으면 오른쪽을 봄
    if (mouse.x < characterCenterX) {
        character.facingLeft = true;  // 왼쪽 방향
    } else {
        character.facingLeft = false; // 오른쪽 방향 (기본 이미지 방향)
    }
}

// 총알 발사 함수
function fireBullet() {
    // 총구 위치 계산 (캐릭터 위치 + 오프셋)
    let muzzleX, muzzleY;
    
    if (character.facingLeft) {
        // 왼쪽을 보고 있을 때 총구 위치 반전
        muzzleX = character.x + character.width - bulletConfig.muzzleOffset.x;
    } else {
        // 오른쪽을 보고 있을 때 총구 위치
        muzzleX = character.x + bulletConfig.muzzleOffset.x;
    }
    muzzleY = character.y + bulletConfig.muzzleOffset.y;
    
    // 총구에서 마우스까지의 방향 계산
    const dirX = mouse.x - muzzleX;
    const dirY = mouse.y - muzzleY;
    
    // 방향 벡터 정규화
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
    const normalizedDirX = dirX / length;
    const normalizedDirY = dirY / length;
    
    // 총알 객체 생성
    const bullet = {
        x: muzzleX,
        y: muzzleY,
        dirX: normalizedDirX,
        dirY: normalizedDirY,
        speed: bulletConfig.speed,
        size: bulletConfig.size
    };
    
    // 총알 배열에 추가
    bullets.push(bullet);
    
    // 마지막 발사 시간 업데이트
    mouse.lastFireTime = Date.now();
}

// 총알 자동 발사 체크 함수
function checkAutoFire() {
    if (mouse.isDown) {
        const currentTime = Date.now();
        // 마지막 발사 이후 일정 시간(fireRate)이 지났는지 확인
        if (currentTime - mouse.lastFireTime >= bulletConfig.fireRate) {
            // 방향 업데이트 후 발사
            updateCharacterDirection();
            fireBullet();
        }
    }
}

// 총알 업데이트 함수
function updateBullets() {
    // 화면 밖으로 나간 총알 제거를 위한 필터링
    const activeBullets = [];
    
    for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];
        
        // 총알 위치 업데이트
        bullet.x += bullet.dirX * bullet.speed;
        bullet.y += bullet.dirY * bullet.speed;
        
        // 장애물과의 충돌 체크
        let bulletHit = false;
        for (const obstacle of obstacles) {
            // 총알 반경을 사용하여 간단한 충돌 박스 생성
            const bulletRect = {
                x: bullet.x - bullet.size,
                y: bullet.y - bullet.size,
                width: bullet.size * 2,
                height: bullet.size * 2
            };
            
            if (checkCollision(bulletRect, obstacle)) {
                // 솔리드 장애물에만 충돌 처리
                if (obstacle.type === 'solid') {
                    bulletHit = true;
                    break;
                }
                // bulletPassable 장애물은 총알 통과
            }
        }
        
        // 화면 내에 있고 장애물에 맞지 않은 총알만 유지
        if (
            !bulletHit &&
            bullet.x >= 0 && bullet.x <= canvas.width &&
            bullet.y >= 0 && bullet.y <= canvas.height
        ) {
            activeBullets.push(bullet);
        }
    }
    
    // 활성 총알로 배열 갱신
    bullets.length = 0;
    bullets.push(...activeBullets);
}

// 총알 그리기 함수
function drawBullets() {
    ctx.fillStyle = bulletConfig.color;
    
    for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 총알 궤적 효과 (선택적)
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'; // 반투명 금색
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x - bullet.dirX * 10, bullet.y - bullet.dirY * 10);
        ctx.stroke();
    }
}

// 게임 초기화 시 장애물 생성
function generateObstacles() {
    obstacles.length = 0; // 기존 장애물 제거
    
    // 랜덤하게 장애물 개수 결정 (5~8개)
    const count = Math.floor(Math.random() * (obstacleConfig.maxCount - obstacleConfig.minCount + 1)) + obstacleConfig.minCount;
    console.log(`장애물 ${count}개 생성 시작`);
    
    // 장애물 타입별 개수 결정
    // 최소 절반은 block 계열(solid)이 되도록 설정
    const minSolidCount = Math.ceil(count / 2); // 최소 절반을 올림하여 계산
    const maxBulletPassableCount = count - minSolidCount; // 나머지는 bulletPassable 타입
    
    // 각 타입별 남은 개수 추적
    let remainingSolidCount = minSolidCount;
    let remainingBulletPassableCount = maxBulletPassableCount;
    
    console.log(`장애물 구성: 총 ${count}개 중 완전 장애물(solid) ${minSolidCount}개, 반투명 장애물(bulletPassable) ${maxBulletPassableCount}개`);
    
    // 랜덤 위치에 장애물 생성
    for (let i = 0; i < count; i++) {
        let validPosition = false;
        let newObstacle;
        let attempts = 0;
        
        // 유효한 위치를 찾을 때까지 시도 (최대 30회)
        while (!validPosition && attempts < 30) {
            attempts++;
            
            // 랜덤 위치 생성 (가장자리 10% 여백)
            const padding = Math.max(canvas.width, canvas.height) * 0.1;
            const x = padding + Math.random() * (canvas.width - padding * 2);
            const y = padding + Math.random() * (canvas.height - padding * 2);
            
            // 장애물 종류 결정 (남은 타입별 개수에 따라)
            let obstacleType;
            
            if (remainingSolidCount <= 0) {
                // solid 타입을 모두 사용했으면 bulletPassable만 생성
                obstacleType = 'bulletPassable';
            } else if (remainingBulletPassableCount <= 0) {
                // bulletPassable 타입을 모두 사용했으면 solid만 생성
                obstacleType = 'solid';
            } else {
                // 둘 다 남아있다면 랜덤하게 결정 (solid 60%, bulletPassable 40%)
                obstacleType = Math.random() < 0.6 ? 'solid' : 'bulletPassable';
            }
            
            // 해당 종류에서 랜덤 이미지 선택
            const types = obstacleConfig.types[obstacleType];
            const imageType = types[Math.floor(Math.random() * types.length)];
            
            // 타입에 따른 초기 크기 설정
            const initialSize = obstacleType === 'solid' 
                ? obstacleConfig.solidSize 
                : obstacleConfig.bulletPassableSize;
            
            // 새 장애물 객체 생성 (초기에는 기본 크기로 설정, 그리기 시 비율 적용)
            newObstacle = {
                x,
                y,
                width: initialSize,  // 타입에 따른 초기 너비
                height: initialSize, // 타입에 따른 초기 높이
                type: obstacleType,
                imageType: imageType
            };
            
            // 플레이어 주변에 장애물 생성 금지
            const playerDist = calculateDistance(
                character.x + character.width/2, 
                character.y + character.height/2,
                x + initialSize/2,
                y + initialSize/2
            );
            
            if (playerDist < obstacleConfig.playerClearRadius) {
                continue; // 플레이어와 너무 가까움
            }
            
            // 다른 장애물과의 거리 체크
            validPosition = true;
            for (const obstacle of obstacles) {
                const dist = calculateDistance(
                    x + initialSize/2,
                    y + initialSize/2,
                    obstacle.x + obstacle.width/2,
                    obstacle.y + obstacle.height/2
                );
                
                if (dist < obstacleConfig.minDistance) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        // 유효한 위치를 찾았으면 장애물 추가
        if (validPosition) {
            // 추가된 장애물의 타입에 따라 남은 개수 갱신
            if (newObstacle.type === 'solid') {
                remainingSolidCount--;
            } else {
                remainingBulletPassableCount--;
            }
            
            obstacles.push(newObstacle);
            console.log(`장애물 ${i+1} 생성: ${newObstacle.imageType} (타입: ${newObstacle.type}, 위치: ${newObstacle.x.toFixed(0)}, ${newObstacle.y.toFixed(0)})`);
        } else {
            console.log(`장애물 ${i+1} 생성 실패: 적절한 위치를 찾을 수 없음`);
        }
    }
    
    // 최종 타입별 통계 계산
    const solidCount = obstacles.filter(o => o.type === 'solid').length;
    const bulletPassableCount = obstacles.filter(o => o.type === 'bulletPassable').length;
    
    console.log(`총 ${obstacles.length}개의 장애물 생성 완료 (완전 장애물: ${solidCount}개, 반투명 장애물: ${bulletPassableCount}개)`);
}

// 두 점 사이의 거리 계산
function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 장애물 그리기 함수
function drawObstacles() {
    for (const obstacle of obstacles) {
        const img = obstacleImages[obstacle.imageType];
        if (img.complete) { // 이미지가 로드된 경우에만 그리기
            // 타입에 따라 다른 크기 적용
            const baseSize = obstacle.type === 'solid' 
                ? obstacleConfig.solidSize 
                : obstacleConfig.bulletPassableSize;
            
            // 원본 이미지 비율에 맞게 크기 조정
            const originalSize = obstacleConfig.originalSizes[obstacle.imageType];
            if (originalSize) {
                // 원본 비율 계산
                const aspectRatio = originalSize.width / originalSize.height;
                
                // 기준 크기를 사용하면서 비율 유지
                let width, height;
                
                if (aspectRatio >= 1) {
                    // 가로가 더 길거나 같은 경우
                    width = baseSize;
                    height = baseSize / aspectRatio;
                } else {
                    // 세로가 더 긴 경우
                    height = baseSize;
                    width = baseSize * aspectRatio;
                }
                
                // 충돌 계산을 위한 장애물 크기 업데이트
                obstacle.width = width;
                obstacle.height = height;
                
                // 캔버스 상태 저장 (필터 효과 적용을 위해)
                ctx.save();
                
                // all 계열 장애물은 어둡게 표시
                if (obstacle.type === 'bulletPassable') {
                    // 어둡게 표시하기 위한 필터 설정
                    ctx.filter = 'brightness(70%)';
                }
                
                // 비율에 맞게 이미지 그리기
                ctx.drawImage(img, obstacle.x, obstacle.y, width, height);
                
                // 캔버스 상태 복원
                ctx.restore();
            } else {
                // 원본 크기 정보가 없는 경우 기본 크기로 그리기
                obstacle.width = baseSize;
                obstacle.height = baseSize;
                
                // 캔버스 상태 저장
                ctx.save();
                
                // all 계열 장애물은 어둡게 표시
                if (obstacle.type === 'bulletPassable') {
                    ctx.filter = 'brightness(70%)';
                }
                
                ctx.drawImage(img, obstacle.x, obstacle.y, baseSize, baseSize);
                
                // 캔버스 상태 복원
                ctx.restore();
            }
        }
    }
}

// 두 직사각형 충돌 감지
function checkCollision(rect1, rect2) {
    // 충돌 계산 (약간의 여백을 둬서 자연스러운 이동)
    const padding = 5;
    return (
        rect1.x + padding < rect2.x + rect2.width &&
        rect1.x + rect1.width - padding > rect2.x &&
        rect1.y + padding < rect2.y + rect2.height &&
        rect1.y + rect1.height - padding > rect2.y
    );
}

// 대시 수행 함수
function performDash() {
    const currentTime = Date.now();
    
    // 쿨다운 체크
    if (currentTime - character.lastDashTime < character.dashCooldown) {
        console.log('대시 쿨다운 중...');
        return;
    }
    
    // 대시 방향 결정
    let dashX = 0;
    let dashY = 0;
    
    // 방향키가 눌려있는 경우, 그 방향으로 대시
    if (keys.w || keys.a || keys.s || keys.d) {
        if (keys.w) dashY = -1;
        if (keys.s) dashY = 1;
        if (keys.a) dashX = -1;
        if (keys.d) dashX = 1;
    } else {
        // 방향키가 눌려있지 않은 경우, 캐릭터가 보고 있는 방향으로 대시
        dashX = character.facingLeft ? -1 : 1;
    }
    
    // 대시 방향 정규화 (대각선 대시가 더 빠르지 않도록)
    const length = Math.sqrt(dashX * dashX + dashY * dashY);
    if (length > 0) {
        dashX /= length;
        dashY /= length;
    }
    
    // 대시 상태 설정
    character.isDashing = true;
    character.lastDashTime = currentTime;
    character.dashDirection.x = dashX;
    character.dashDirection.y = dashY;
    
    // 대시 시작 위치 저장 (이펙트 표시용)
    character.dashStartPosition.x = character.x + character.width / 2;
    character.dashStartPosition.y = character.y + character.height / 2;
    
    // 대시 이펙트 활성화
    activateDashEffect(dashX, dashY);
    
    console.log(`대시 실행: ${dashX}, ${dashY}`);
    
    // 일정 시간 후 대시 상태 해제
    setTimeout(() => {
        character.isDashing = false;
        // 대시가 끝나면 이펙트도 함께 종료
        dashEffect.active = false;
    }, character.dashDuration);
}

// 대시 이펙트 활성화 함수
function activateDashEffect(dirX, dirY) {
    // 대시 이펙트 설정
    dashEffect.active = true;
    dashEffect.currentFrame = 0;
    dashEffect.lastFrameUpdateTime = Date.now();
    
    // 대시 이펙트 위치 설정 (캐릭터 중심)
    dashEffect.position.x = character.x + character.width / 2;
    dashEffect.position.y = character.y + character.height / 2;
    
    // 반대 방향으로 설정 (캐릭터 뒤쪽에 표시)
    dashEffect.direction.x = -dirX;
    dashEffect.direction.y = -dirY;
    
    // 방향에 따른 각도 계산 (라디안)
    dashEffect.angle = Math.atan2(dirY, dirX);
    
    // 왼쪽 방향(dirX < 0)으로 대시할 때 이펙트를 수직으로 뒤집음
    dashEffect.flipVertical = (dirX < 0);
    
    console.log(`대시 이펙트 각도: ${dashEffect.angle * (180 / Math.PI)}도, 수직 뒤집기: ${dashEffect.flipVertical}`);
}

// 대시 이펙트 업데이트 함수
function updateDashEffect(timestamp) {
    // 대시 중이 아니면 이펙트 비활성화
    if (!character.isDashing) {
        dashEffect.active = false;
    }
    
    if (!dashEffect.active) return;
    
    const currentTime = timestamp || Date.now();
    const elapsed = currentTime - dashEffect.lastFrameUpdateTime;
    
    // 프레임 업데이트
    if (elapsed > dashEffect.frameDuration) {
        dashEffect.currentFrame++;
        dashEffect.lastFrameUpdateTime = currentTime;
        
        // 모든 프레임 재생 완료 시 비활성화
        if (dashEffect.currentFrame >= dashEffect.frameCount) {
            dashEffect.active = false;
        }
    }
    
    // 대시 이펙트 위치 업데이트 (캐릭터 뒤에 위치하도록)
    // 캐릭터의 크기와 이펙트 크기를 고려하여 위치 조정
    const offsetDistance = 60; // 캐릭터로부터의 거리 증가 (25에서 60으로 증가)
    
    // 캐릭터 중심에서 대시 반대 방향으로 충분히 떨어진 위치에 이펙트 배치
    dashEffect.position.x = character.x + character.width / 2 + (dashEffect.direction.x * offsetDistance);
    dashEffect.position.y = character.y + character.height / 2 + (dashEffect.direction.y * offsetDistance);
}

// 대시 이펙트 그리기 함수
function drawDashEffect() {
    if (!dashEffect.active || !dashEffect.image.complete) return;
    
    // 스프라이트 시트에서 현재 프레임 위치 계산
    const srcY = dashEffect.currentFrame * dashEffect.frameHeight;
    
    // 캔버스 상태 저장 (회전 변환을 위해)
    ctx.save();
    
    // 이펙트 위치로 캔버스 원점 이동
    ctx.translate(dashEffect.position.x, dashEffect.position.y);
    
    // 대시 방향에 따라 캔버스 회전 (360도 회전하여 원래 방향의 반대로)
    ctx.rotate(dashEffect.angle);
    
    // 왼쪽 대시일 때 수직으로 뒤집기
    if (dashEffect.flipVertical) {
        ctx.scale(1, -1);  // Y축으로 뒤집기 (수직 반전)
    }
    
    // 이펙트 그리기 (원점 중심으로)
    ctx.drawImage(
        dashEffect.image,
        0, srcY, 
        dashEffect.frameWidth, dashEffect.frameHeight,
        -dashEffect.frameWidth * dashEffect.scale / 2, // 중앙 정렬을 위해 절반 크기만큼 왼쪽으로
        -dashEffect.frameHeight * dashEffect.scale / 2, // 중앙 정렬을 위해 절반 크기만큼 위로
        dashEffect.frameWidth * dashEffect.scale,
        dashEffect.frameHeight * dashEffect.scale
    );
    
    // 캔버스 상태 복원
    ctx.restore();
}

// 게임 업데이트 함수 수정 - 대시 이펙트 업데이트 추가
function gameLoop(timestamp) {
    // 이동 처리
    moveCharacter();
    
    // 마우스 위치에 따라 캐릭터 방향 업데이트
    updateCharacterDirection();
    
    // 자동 발사 체크
    checkAutoFire();
    
    // 애니메이션 프레임 업데이트
    handlePlayerFrame(timestamp);
    
    // 대시 이펙트 업데이트
    updateDashEffect(timestamp);
    
    // 총알 업데이트
    updateBullets();
    
    // 게임 화면 그리기
    drawGame();
    
    // 다음 프레임 요청
    requestAnimationFrame(gameLoop);
}

// 이미지 로드 완료 후 게임 시작
function startGameIfAllImagesLoaded() {
    imagesLoaded++;
    console.log(`이미지 로드 진행: ${imagesLoaded}/${totalImages}`);
    if (imagesLoaded === totalImages) {
        console.log('모든 이미지 로드 완료');
        
        // 캐릭터 이동 시 크기 설정 (프레임 크기 × 스케일)
        character.width = character.frameWidth * character.scale;
        character.height = character.frameHeight * character.scale;
        
        // 정지 상태 이미지 크기 설정 (이동 이미지와 동일)
        character.idleWidth = character.width;
        character.idleHeight = character.height;
        
        // 캐릭터 위치 조정 (화면 중앙)
        character.x = (canvas.width - character.width) / 2;
        character.y = (canvas.height - character.height) / 2;
        
        console.log('프레임 크기:', character.frameWidth, 'x', character.frameHeight);
        console.log('화면 표시 크기:', character.width, 'x', character.height);
        
        // 장애물 생성
        generateObstacles();
        
        // 게임 루프 시작
        requestAnimationFrame(gameLoop);
    }
}

playerSprite.onload = startGameIfAllImagesLoaded;
playerIdleSprite.onload = startGameIfAllImagesLoaded;

// 이미지 로드 실패 시 처리
tilesetImage.onerror = function() {
    console.error('타일셋 이미지를 로드할 수 없습니다: ' + tilesetImage.src);
    startGameIfAllImagesLoaded(); // 오류가 발생해도 다른 이미지가 로드되면 게임 시작
};

playerSprite.onerror = function() {
    console.error('이미지를 로드할 수 없습니다: ' + playerSprite.src);
    // 대체 처리 (간단한 사각형으로 표시)
    character.width = 50;
    character.height = 50;
    startGameIfAllImagesLoaded(); // 오류가 발생해도 다른 이미지가 로드되면 게임 시작
};

playerIdleSprite.onerror = function() {
    console.error('이미지를 로드할 수 없습니다: ' + playerIdleSprite.src);
    startGameIfAllImagesLoaded(); // 오류가 발생해도 다른 이미지가 로드되면 게임 시작
};

// 이미지 로드 실패 핸들러 추가
for (const key in obstacleImages) {
    obstacleImages[key].onerror = function() {
        console.error(`장애물 이미지를 로드할 수 없습니다: ${this.src}`);
        startGameIfAllImagesLoaded(); // 오류가 발생해도 다른 이미지가 로드되면 게임 시작
    };
    
    obstacleImages[key].onload = function() {
        // 이미지 로드 시 원본 크기 정보 저장
        obstacleConfig.originalSizes[key] = {
            width: this.naturalWidth,
            height: this.naturalHeight
        };
        console.log(`장애물 이미지 로드: ${key}, 크기: ${this.naturalWidth}x${this.naturalHeight}`);
        startGameIfAllImagesLoaded();
    };
} 