"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface Platform {
  x: number
  y: number
  width: number
  height: number
}

interface Collectible {
  x: number
  y: number
  width: number
  height: number
  collected: boolean
  floatOffset: number
  floatSpeed: number
}

interface Player {
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
  onGround: boolean
  invincible: boolean
  invincibleTimer: number
  powered: boolean
  poweredTimer: number
  originalWidth: number
  originalHeight: number
}

interface Enemy {
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  direction: number
  patrolStart: number
  patrolEnd: number
}

interface DeathMark {
  x: number
  y: number
  width: number
  height: number
}

interface Cloud {
  x: number
  y: number
  width: number
  height: number
  speed: number
  opacity: number
}

export default function SuperMoo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const mooVideoRef = useRef<HTMLVideoElement>(null)
  const wolfVideoRef = useRef<HTMLVideoElement>(null)
  const grassImageRef = useRef<HTMLImageElement>(null)
  const platformImageRef = useRef<HTMLImageElement>(null)
  const bottomImageRef = useRef<HTMLImageElement>(null)
  const cowImageRef = useRef<HTMLImageElement>(null)

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [grassCollected, setGrassCollected] = useState(0)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [enemyKills, setEnemyKills] = useState(0)
  const [assetsLoaded, setAssetsLoaded] = useState(false)
  const [cowImage, setCowImage] = useState<HTMLImageElement | null>(null)

  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 400
  const GRAVITY = 1.2
  const JUMP_FORCE = -18
  const MOVE_SPEED = 12

  const gameStateRef = useRef({
    player: {
      x: 50,
      y: 300,
      width: 60,
      height: 60,
      velocityX: 0,
      velocityY: 0,
      onGround: false,
      invincible: false,
      invincibleTimer: 0,
      powered: false,
      poweredTimer: 0,
      originalWidth: 60,
      originalHeight: 60,
    } as Player,
    platforms: [] as Platform[],
    grass: [] as Collectible[],
    enemies: [] as Enemy[],
    deathMarks: [] as DeathMark[],
    milkBottle: null as Collectible | null,
    keys: { left: false, right: false, space: false },
    cameraX: 0,
    clouds: [] as Cloud[],
    grassCollected: 0,
    score: 0,
    enemyKills: 0,
    lives: 3,
    invulnerable: false,
    invulnerabilityTimer: 0,
    milkPowerUp: false,
    milkTimer: 0,
    distance: 0,
  })

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const promises: Promise<void>[] = []

        const mooVideo = mooVideoRef.current
        const wolfVideo = wolfVideoRef.current

        if (mooVideo) {
          promises.push(
            new Promise<void>((resolve) => {
              mooVideo.loop = true
              mooVideo.muted = true
              mooVideo.preload = "auto"
              mooVideo.addEventListener("canplaythrough", () => resolve(), { once: true })
              mooVideo.load()
            }),
          )
        }

        if (wolfVideo) {
          promises.push(
            new Promise<void>((resolve) => {
              wolfVideo.loop = true
              wolfVideo.muted = true
              wolfVideo.preload = "auto"
              wolfVideo.addEventListener("canplaythrough", () => resolve(), { once: true })
              wolfVideo.load()
            }),
          )
        }

        const grassImage = grassImageRef.current
        const platformImage = platformImageRef.current
        const bottomImage = bottomImageRef.current
        const cowImage = cowImageRef.current

        if (grassImage) {
          promises.push(
            new Promise<void>((resolve) => {
              grassImage.addEventListener("load", () => resolve(), { once: true })
              if (grassImage.complete) resolve()
            }),
          )
        }

        if (platformImage) {
          promises.push(
            new Promise<void>((resolve) => {
              platformImage.addEventListener("load", () => resolve(), { once: true })
              if (platformImage.complete) resolve()
            }),
          )
        }

        if (bottomImage) {
          promises.push(
            new Promise<void>((resolve) => {
              bottomImage.addEventListener("load", () => resolve(), { once: true })
              if (bottomImage.complete) resolve()
            }),
          )
        }

        const cowImg = new Image()
        cowImg.src =
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Determined_Cow_Racing_Through_City-removebg-preview-0LQUsCDCajrbmPm7mtRsx4aTA2Lycp.png"
        await new Promise((resolve) => {
          cowImg.onload = resolve
        })
        setCowImage(cowImg)

        await Promise.all(promises)
        setAssetsLoaded(true)
      } catch (error) {
        console.error("Error loading assets:", error)
      }
    }

    loadAssets()
  }, [])

  const initializeLevel = () => {
    const state = gameStateRef.current

    state.player = {
      x: 50,
      y: 300,
      width: 60,
      height: 60,
      velocityX: 0,
      velocityY: 0,
      onGround: false,
      invincible: false,
      invincibleTimer: 0,
      powered: false,
      poweredTimer: 0,
      originalWidth: 60,
      originalHeight: 60,
    }

    state.cameraX = 0

    state.platforms = []
    for (let i = 0; i < 150; i++) {
      state.platforms.push({ x: i * 200, y: 350, width: 200, height: 50 })
    }

    for (let i = 1; i < 75; i++) {
      if (i % 4 === 0 && Math.random() < 0.6) {
        const baseX = i * 250

        // Create a sequence: Level 1 -> Level 2 -> Level 3
        // Level 1 platform (reachable from ground)
        state.platforms.push({
          x: baseX,
          y: 250,
          width: 200,
          height: 20,
        })

        // Level 2 platform (reachable from Level 1)
        if (Math.random() < 0.7) {
          state.platforms.push({
            x: baseX + 180,
            y: 180,
            width: 200,
            height: 20,
          })

          // Level 3 platform (reachable from Level 2)
          if (Math.random() < 0.5) {
            state.platforms.push({
              x: baseX + 360,
              y: 110,
              width: 200,
              height: 20,
            })
          }
        }
      }
    }

    state.grass = []

    // Ground level grass - single row only
    for (let i = 0; i < 150; i++) {
      // Only one grass per platform section
      state.grass.push({
        x: i * 200 + 100,
        y: 300,
        width: 25,
        height: 25,
        collected: false,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.05 + Math.random() * 0.03,
      })
    }

    // Hovering platform grass - single items only
    const hoveringPlatforms = state.platforms.filter((p) => p.y < 350)
    hoveringPlatforms.forEach((platform) => {
      // Only one grass per hovering platform
      state.grass.push({
        x: platform.x + platform.width / 2 - 12,
        y: platform.y - 40,
        width: 25,
        height: 25,
        collected: false,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.05 + Math.random() * 0.03,
      })
    })

    state.enemies = []

    for (let i = 2; i < 25; i += 6) {
      const platformX = i * 200
      state.enemies.push({
        x: platformX + 100,
        y: 280,
        width: 70,
        height: 70,
        velocityX: 1,
        direction: -1,
        patrolStart: platformX,
        patrolEnd: platformX + 120,
      })
    }

    hoveringPlatforms.forEach((platform, index) => {
      if (index % 3 === 0) {
        state.enemies.push({
          x: platform.x + 30,
          y: platform.y - 70,
          width: 70,
          height: 70,
          velocityX: 1.5,
          direction: Math.random() > 0.5 ? 1 : -1,
          patrolStart: platform.x + 10,
          patrolEnd: platform.x + platform.width - 80,
        })
      }
    })

    const milkBottles: Collectible[] = []

    const suitablePlatforms = state.platforms.filter((p) => p.y < 350)
    suitablePlatforms.forEach((platform, index) => {
      if (index % 5 === 0 && index > 0) {
        milkBottles.push({
          x: platform.x + platform.width / 2 - 15,
          y: platform.y - 40,
          width: 30,
          height: 40,
          collected: false,
        })

        for (let j = 0; j < 3; j++) {
          const nearbyPlatform = suitablePlatforms[index + j - 1] || platform
          state.enemies.push({
            x: nearbyPlatform.x + 20,
            y: nearbyPlatform.y - 70,
            width: 70,
            height: 70,
            velocityX: 1.5,
            direction: Math.random() > 0.5 ? 1 : -1,
            patrolStart: nearbyPlatform.x,
            patrolEnd: nearbyPlatform.x + nearbyPlatform.width - 35,
          })
        }
      }
    })

    if (milkBottles.length > 0) {
      state.milkBottle = milkBottles[0]
    }

    state.clouds = []
    for (let i = 0; i < 15; i++) {
      state.clouds.push({
        x: Math.random() * 3000 - 500,
        y: Math.random() * 150 + 20,
        width: Math.random() * 80 + 60,
        height: Math.random() * 40 + 30,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.4 + 0.3,
      })
    }

    state.deathMarks = []

    state.grassCollected = 0
    state.score = 0
    state.enemyKills = 0
    state.lives = 3
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          state.keys.left = true
          break
        case "ArrowRight":
        case "KeyD":
          state.keys.right = true
          break
        case "Space":
        case "ArrowUp":
        case "KeyW":
          e.preventDefault()
          state.keys.space = true
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const state = gameStateRef.current
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          state.keys.left = false
          break
        case "ArrowRight":
        case "KeyD":
          state.keys.right = false
          break
        case "Space":
        case "ArrowUp":
        case "KeyW":
          state.keys.space = false
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  const startGame = () => {
    setGameState("playing")
    gameStateRef.current.lives = 3
    initializeLevel()
  }

  const gameOver = () => {
    setGameState("gameOver")
  }

  const checkCollision = (rect1: any, rect2: any): boolean => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    )
  }

  const updateGame = () => {
    if (gameState !== "playing") return

    const state = gameStateRef.current
    const { player, platforms, grass, enemies, keys, clouds } = state

    const mooVideo = mooVideoRef.current
    const wolfVideo = wolfVideoRef.current
    const isMoving = keys.left || keys.right || Math.abs(player.velocityX) > 0.1

    if (mooVideo) {
      if (isMoving && mooVideo.paused) {
        mooVideo.currentTime = 0
        mooVideo.play().catch(() => {})
      } else if (!isMoving && !mooVideo.paused) {
        mooVideo.pause()
      }
    }

    if (wolfVideo && wolfVideo.paused) {
      wolfVideo.play().catch(() => {})
    }

    if (keys.left) {
      player.velocityX = player.onGround ? -MOVE_SPEED : -MOVE_SPEED * 0.6
    } else if (keys.right) {
      player.velocityX = player.onGround ? MOVE_SPEED : MOVE_SPEED * 0.6
    } else {
      player.velocityX = 0
    }

    if (keys.space && player.onGround) {
      player.velocityY = JUMP_FORCE
      player.onGround = false
    }

    player.velocityY += GRAVITY

    player.x += player.velocityX
    player.y += player.velocityY

    player.onGround = false
    for (const platform of platforms) {
      if (checkCollision(player, platform)) {
        if (player.velocityY > 0 && player.y < platform.y) {
          player.y = platform.y - player.height
          player.velocityY = 0
          player.onGround = true
        } else if (player.velocityY < 0 && player.y > platform.y) {
          player.y = platform.y + platform.height
          player.velocityY = 0
        } else if (player.velocityX > 0) {
          player.x = platform.x - player.width
        } else if (player.velocityX < 0) {
          player.x = platform.x + platform.width
        }
      }
    }

    if (player.x < 0) player.x = 0
    if (player.y > CANVAS_HEIGHT) {
      player.x = 50
      player.y = 300
      player.velocityY = 0
    }

    state.cameraX = player.x - CANVAS_WIDTH / 3

    for (const grassItem of grass) {
      if (!grassItem.collected && checkCollision(player, grassItem)) {
        grassItem.collected = true
        state.grassCollected += 1
        state.score += 10
        setGrassCollected(state.grassCollected)
        setScore(state.score)
      }
    }

    if (player.x > state.grass.length * 100 - 1000) {
      const currentPlatformLength = state.platforms.filter((p) => p.y >= 350).length
      const startX = currentPlatformLength * 200

      for (let i = 0; i < 15; i++) {
        if (Math.random() < 0.4) {
          const baseX = startX + i * 400

          // Create progressive sequence
          // Level 1 platform
          const level1Platform = {
            x: baseX,
            y: 250,
            width: 200,
            height: 20,
          }
          state.platforms.push(level1Platform)

          // Single grass per level 1 platform
          state.grass.push({
            x: level1Platform.x + level1Platform.width / 2 - 12,
            y: level1Platform.y - 25,
            width: 25,
            height: 25,
            collected: false,
            floatOffset: Math.random() * Math.PI * 2,
            floatSpeed: 0.05 + Math.random() * 0.03,
          })

          // Level 2 platform (70% chance)
          if (Math.random() < 0.7) {
            const level2Platform = {
              x: baseX + 180,
              y: 180,
              width: 200,
              height: 20,
            }
            state.platforms.push(level2Platform)

            state.grass.push({
              x: level2Platform.x + level2Platform.width / 2 - 12,
              y: level2Platform.y - 25,
              width: 25,
              height: 25,
              collected: false,
              floatOffset: Math.random() * Math.PI * 2,
              floatSpeed: 0.05 + Math.random() * 0.03,
            })

            // Level 3 platform (50% chance)
            if (Math.random() < 0.5) {
              const level3Platform = {
                x: baseX + 360,
                y: 110,
                width: 200,
                height: 20,
              }
              state.platforms.push(level3Platform)

              state.grass.push({
                x: level3Platform.x + level3Platform.width / 2 - 12,
                y: level3Platform.y - 25,
                width: 25,
                height: 25,
                collected: false,
                floatOffset: Math.random() * Math.PI * 2,
                floatSpeed: 0.05 + Math.random() * 0.03,
              })
            }
          }
        }
      }
    }

    if (player.invincible) {
      player.invincibleTimer -= 1 / 60
      if (player.invincibleTimer <= 0) {
        player.invincible = false
      }
    }

    if (player.powered) {
      player.poweredTimer -= 1 / 60
      if (player.poweredTimer <= 0) {
        player.powered = false
        player.width = player.originalWidth
        player.height = player.originalHeight
      }
    }

    if (state.milkBottle && !state.milkBottle.collected && checkCollision(player, state.milkBottle)) {
      state.milkBottle.collected = true
      state.score += 100
      setScore(state.score)

      player.invincible = true
      player.invincibleTimer = 10
      player.powered = true
      player.poweredTimer = 10
      player.width = player.originalWidth * 1.3
      player.height = player.originalHeight * 1.3

      const nextMilkX = player.x + 2000 + Math.random() * 1000
      const suitablePlatforms = state.platforms.filter((p) => p.x > nextMilkX && p.x < nextMilkX + 1500 && p.y < 350)

      if (suitablePlatforms.length > 0) {
        const chosenPlatform = suitablePlatforms[Math.floor(Math.random() * suitablePlatforms.length)]
        state.milkBottle = {
          x: chosenPlatform.x + chosenPlatform.width / 2 - 15,
          y: chosenPlatform.y - 40,
          width: 30,
          height: 40,
          collected: false,
        }
      }
    }

    for (const enemy of enemies) {
      enemy.x += enemy.velocityX * enemy.direction

      if (enemy.x <= enemy.patrolStart || enemy.x >= enemy.patrolEnd) {
        enemy.direction *= -1
      }

      if (checkCollision(player, enemy) && !player.invincible) {
        if (player.velocityY > 0 && player.y + player.height < enemy.y + enemy.height / 2) {
          const enemyIndex = enemies.indexOf(enemy)
          if (enemyIndex > -1) {
            state.deathMarks.push({
              x: enemy.x,
              y: enemy.y,
              width: enemy.width,
              height: enemy.height,
            })

            enemies.splice(enemyIndex, 1)
            state.score += 50
            state.enemyKills += 1
            setScore(state.score)
            setEnemyKills(state.enemyKills)
            player.velocityY = -8
          }
        } else {
          state.lives -= 1
          setLives(state.lives)
          if (state.lives <= 0) {
            gameOver()
          } else {
            player.x = 50
            player.y = 300
            player.velocityY = 0
            player.invincible = true
            player.invincibleTimer = 2
          }
        }
      }
    }

    for (const cloud of clouds) {
      cloud.x -= cloud.speed

      if (cloud.x + cloud.width < state.cameraX - 200) {
        cloud.x = state.cameraX + CANVAS_WIDTH + Math.random() * 400
        cloud.y = Math.random() * 150 + 20
        cloud.width = Math.random() * 80 + 60
        cloud.height = Math.random() * 40 + 30
        cloud.speed = Math.random() * 0.5 + 0.2
        cloud.opacity = Math.random() * 0.4 + 0.3
      }
    }
  }

  const drawGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const state = gameStateRef.current

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.save()
    ctx.translate(-state.cameraX, 0)

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    gradient.addColorStop(0, "#87CEEB")
    gradient.addColorStop(0.3, "#B0E0E6")
    gradient.addColorStop(1, "#98FB98")
    ctx.fillStyle = gradient
    ctx.fillRect(state.cameraX, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    for (const cloud of state.clouds) {
      ctx.save()
      ctx.globalAlpha = cloud.opacity
      ctx.fillStyle = "#FFFFFF"

      const numCircles = 5
      for (let i = 0; i < numCircles; i++) {
        const circleX = cloud.x + (i * cloud.width) / (numCircles - 1)
        const circleY = cloud.y + Math.sin(i * 0.8) * (cloud.height * 0.2)
        const radius = cloud.height * (0.4 + Math.sin(i * 1.2) * 0.2)

        ctx.beginPath()
        ctx.arc(circleX, circleY, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    const platformImage = platformImageRef.current
    const bottomImage = bottomImageRef.current

    for (const platform of state.platforms) {
      if (platform.y >= 350) {
        if (bottomImage && bottomImage.complete) {
          ctx.drawImage(bottomImage, platform.x, platform.y - 30, platform.width, platform.height + 30)
        } else {
          ctx.fillStyle = "#8B4513"
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
          ctx.fillStyle = "#32CD32"
          ctx.fillRect(platform.x, platform.y, platform.width, 5)
        }
      } else {
        if (platformImage && platformImage.complete) {
          ctx.drawImage(platformImage, platform.x, platform.y - 10, platform.width, platform.height + 10)
        } else {
          ctx.fillStyle = "#8B4513"
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
          ctx.fillStyle = "#32CD32"
          ctx.fillRect(platform.x, platform.y, platform.width, 5)
        }
      }
    }

    const grassImage = grassImageRef.current
    for (const grassItem of state.grass) {
      if (!grassItem.collected) {
        // Update floating animation
        grassItem.floatOffset += grassItem.floatSpeed
        const floatY = grassItem.y + Math.sin(grassItem.floatOffset) * 3

        // Draw bubble glow effect
        ctx.save()
        ctx.shadowColor = "#90EE90"
        ctx.shadowBlur = 8
        ctx.globalAlpha = 0.8

        if (grassImage && grassImage.complete) {
          ctx.drawImage(grassImage, grassItem.x, floatY, grassItem.width, grassItem.height)
        } else {
          ctx.font = "20px Arial"
          ctx.fillText("🌱", grassItem.x, floatY + 20)
        }

        // Add sparkle effect
        ctx.globalAlpha = 0.6
        ctx.fillStyle = "#FFFFFF"
        ctx.beginPath()
        ctx.arc(grassItem.x + grassItem.width / 2, floatY + grassItem.height / 2, 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      }
    }

    const wolfVideo = wolfVideoRef.current
    for (const enemy of state.enemies) {
      if (wolfVideo && wolfVideo.readyState >= 2) {
        ctx.save()

        const tempCanvas = document.createElement("canvas")
        const tempCtx = tempCanvas.getContext("2d")
        tempCanvas.width = enemy.width
        tempCanvas.height = enemy.height

        if (tempCtx) {
          tempCtx.drawImage(wolfVideo, 0, 0, enemy.width, enemy.height)

          const imageData = tempCtx.getImageData(0, 0, enemy.width, enemy.height)
          const data = imageData.data

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]

            if (r < 30 && g < 30 && b < 30) {
              data[i + 3] = 0
            }
          }

          tempCtx.putImageData(imageData, 0, 0)

          if (enemy.direction < 0) {
            ctx.scale(-1, 1)
            ctx.drawImage(tempCanvas, -enemy.x - enemy.width, enemy.y)
          } else {
            ctx.drawImage(tempCanvas, enemy.x, enemy.y)
          }
        }

        ctx.restore()
      } else {
        ctx.font = "30px Arial"
        ctx.fillText("🐺", enemy.x, enemy.y + 30)
      }
    }

    const mooVideo = mooVideoRef.current
    if (mooVideo && mooVideo.readyState >= 2) {
      ctx.save()

      if (state.player.invincible) {
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() * 0.01)
      }

      const tempCanvas = document.createElement("canvas")
      const tempCtx = tempCanvas.getContext("2d")
      tempCanvas.width = state.player.width
      tempCanvas.height = state.player.height

      if (tempCtx) {
        tempCtx.drawImage(mooVideo, 0, 0, state.player.width, state.player.height)

        const imageData = tempCtx.getImageData(0, 0, state.player.width, state.player.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          if (r < 30 && g < 30 && b < 30) {
            data[i + 3] = 0
          }
        }

        tempCtx.putImageData(imageData, 0, 0)

        if (state.player.velocityX < 0) {
          ctx.scale(-1, 1)
          ctx.drawImage(tempCanvas, -state.player.x - state.player.width, state.player.y)
        } else {
          ctx.drawImage(tempCanvas, state.player.x, state.player.y)
        }
      }

      ctx.restore()
    } else if (cowImage) {
      ctx.save()

      if (state.player.velocityX < 0) {
        ctx.scale(-1, 1)
        ctx.drawImage(
          cowImage,
          -state.player.x - state.player.width,
          state.player.y,
          state.player.width,
          state.player.height,
        )
      } else {
        ctx.drawImage(cowImage, state.player.x, state.player.y, state.player.width, state.player.height)
      }

      ctx.restore()
    } else {
      ctx.font = "30px Arial"
      ctx.fillText("🐄", state.player.x, state.player.y + 30)
    }

    // Draw death marks at their world positions
    ctx.fillStyle = "red"
    ctx.font = "bold 24px Arial"
    ctx.textAlign = "center"
    for (const deathMark of state.deathMarks) {
      ctx.fillText("✕", deathMark.x + deathMark.width / 2, deathMark.y + deathMark.height / 2 + 8)
    }
    ctx.textAlign = "left" // Reset text alignment

    ctx.restore()

    const scoreboardGradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0)
    scoreboardGradient.addColorStop(0, "rgba(30, 30, 30, 0.9)")
    scoreboardGradient.addColorStop(0.5, "rgba(50, 50, 50, 0.8)")
    scoreboardGradient.addColorStop(1, "rgba(30, 30, 30, 0.9)")
    ctx.fillStyle = scoreboardGradient
    ctx.fillRect(5, 5, CANVAS_WIDTH - 10, 60)

    ctx.strokeStyle = "#FFD700"
    ctx.lineWidth = 3
    ctx.strokeRect(5, 5, CANVAS_WIDTH - 10, 60)

    ctx.strokeStyle = "rgba(255, 215, 0, 0.4)"
    ctx.lineWidth = 1
    ctx.strokeRect(7, 7, CANVAS_WIDTH - 14, 56)

    ctx.textAlign = "center"
    ctx.font = "bold 16px Arial"
    ctx.fillStyle = "#FFD700"
    ctx.fillText("🐄 MOO RUNNER STATS 🐄", CANVAS_WIDTH / 2, 25)

    ctx.textAlign = "left"
    ctx.font = "bold 12px Arial"

    const grassColor = `hsl(${(Date.now() * 0.1) % 360}, 70%, 60%)`
    ctx.fillStyle = grassColor
    ctx.fillText("🌱", 20, 45)
    ctx.fillStyle = "#FFFFFF"
    ctx.fillText(`Grass: ${state.grassCollected}`, 40, 45)

    ctx.fillStyle = "#FFD700"
    ctx.fillText("⭐", 130, 45)
    ctx.fillStyle = "#FFFFFF"
    ctx.fillText(`Score: ${state.score.toLocaleString()}`, 150, 45)

    ctx.fillStyle = "#FF4444"
    ctx.fillText("💀", 260, 45)
    ctx.fillStyle = "#FFFFFF"
    ctx.fillText(`Kills: ${state.enemyKills}`, 280, 45)

    const heartScale = 1 + 0.1 * Math.sin(Date.now() * 0.005)
    ctx.save()
    ctx.scale(heartScale, heartScale)
    ctx.fillStyle = "#FF6B6B"
    ctx.fillText("❤️", 370 / heartScale, 45 / heartScale)
    ctx.restore()
    ctx.fillStyle = "#FFFFFF"
    ctx.fillText(`Lives: ${state.lives}`, 390, 45)

    const distance = Math.floor(state.player.x / 10)
    ctx.fillStyle = "#87CEEB"
    ctx.fillText("📏", 480, 45)
    ctx.fillStyle = "#FFFFFF"
    ctx.fillText(`${distance}m`, 500, 45)

    if (state.player.invincible) {
      const glowIntensity = 0.5 + 0.5 * Math.sin(Date.now() * 0.01)
      ctx.fillStyle = `rgba(255, 215, 0, ${glowIntensity})`
      ctx.fillText("⚡", 580, 45)
      ctx.fillStyle = "#FFD700"
      ctx.font = "bold 10px Arial"
      ctx.fillText(`${Math.ceil(state.player.invincibleTimer)}s`, 600, 45)
    }
  }

  useEffect(() => {
    if (gameState === "playing") {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState])

  const gameLoop = () => {
    updateGame()
    drawGame()
    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-400 p-4">
      <video
        ref={mooVideoRef}
        src="moo.mp4"
        style={{ display: "none" }}
        crossOrigin="anonymous"
      />
      <video
        ref={wolfVideoRef}
        src="wolf.mp4"
        style={{ display: "none" }}
        crossOrigin="anonymous"
      />
      <img
        ref={grassImageRef}
        src="grass.png"
        style={{ display: "none" }}
        crossOrigin="anonymous"
        alt="Grass"
      />
      <img
        ref={platformImageRef}
        src="hovering.png"
        style={{ display: "none" }}
        crossOrigin="anonymous"
        alt="Platform"
      />
      <img
        ref={bottomImageRef}
        src="bottom.jpg"
        style={{ display: "none" }}
        crossOrigin="anonymous"
        alt="Bottom Ground"
      />
      <img
        ref={cowImageRef}
        src="cow.png"
        style={{ display: "none" }}
        crossOrigin="anonymous"
        alt="Cow"
      />

      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img
            src="cow.png"
            alt="Moo"
            className="w-12 h-12"
          />
          <h1 className="text-4xl font-bold text-white">Moo Runner</h1>
        </div>
        <p className="text-lg text-white">Endless grass collecting adventure! Avoid the wolves!</p>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-brown-600 rounded-lg shadow-lg bg-blue-200"
        />

        {!assetsLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 rounded-lg">
            <div className="text-center text-white">
              <h2 className="text-2xl font-bold mb-4">Loading Moo Runner...</h2>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="mt-4">Preparing your moo-tastic adventure!</p>
            </div>
          </div>
        )}

        {gameState === "menu" && assetsLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 rounded-lg">
            <div className="text-center text-white mb-6">
              <h2 className="text-3xl font-bold mb-4">Moo Runner - Endless Adventure!</h2>
              <div className="text-left space-y-2 mb-6">
                <p>
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Determined_Cow_Racing_Through_City-removebg-preview-0LQUsCDCajrbmPm7mtRsx4aTA2Lycp.png"
                    alt="Cow"
                    className="inline w-6 h-6"
                  />{" "}
                  Use ARROW KEYS or WASD to move the cow
                </p>
                <p>⬆️ SPACE or UP to jump</p>
                <p>🌱 Collect grass to increase your score</p>
                <p>🐺 Avoid the wolves or lose a life!</p>
                <p>❤️ You have 3 lives - survive as long as possible!</p>
              </div>
            </div>
            <Button onClick={startGame} size="lg" className="text-xl px-8 py-4 bg-green-600 hover:bg-green-700">
              Start Game
            </Button>
          </div>
        )}

        {gameState === "gameOver" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 rounded-lg">
            <div className="text-center text-white mb-6">
              <h2 className="text-3xl font-bold mb-4">Game Over! 💀</h2>
              <p className="text-xl mb-2">Final Score: {score}</p>
              <p className="text-lg mb-2">Grass Collected: {grassCollected}</p>
              <p className="text-lg mb-2">Wolves Defeated: {enemyKills}</p>
              <p className="text-lg mb-6">The wolves got you!</p>
            </div>
            <Button onClick={startGame} size="lg" className="text-xl px-6 py-3 bg-green-600 hover:bg-green-700">
              Try Again
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-white">
        <p className="text-sm mb-2">  Fun Mini Game  to support Lamumu Developed by Bella in Lamumu🐮</p>
      </div>
    </div>
  )
}
