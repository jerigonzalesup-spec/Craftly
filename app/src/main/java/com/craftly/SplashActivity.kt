package com.craftly

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.graphics.LinearGradient
import android.graphics.Shader
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.animation.doOnEnd
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.auth.presentation.ui.LoginActivity
import com.craftly.databinding.ActivitySplashBinding

/**
 * SplashActivity — Creative branded splash screen.
 *
 * Animation sequence (total ~2.5s):
 *   0ms   → glow pulses in (fade + slight scale)
 *   200ms → logo bounces in (scale 0.3→1.0 with overshoot, concurrent fade)
 *   750ms → "Craftly" brand name fades in left→right
 *   950ms → decorative dots pop in sequentially
 *  1100ms → tagline slides up from below + fades in
 *  1300ms → spinner + version text appear
 *  2500ms → all content fades out, navigate to LoginActivity
 */
class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on during splash (prevents screen-off mid-animation)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        // Status/nav bar colors handled by Theme.Craftly.Splash in themes.xml

        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Populate the version label
        try {
            val pInfo = packageManager.getPackageInfo(packageName, 0)
            binding.splashVersion.text = "v${pInfo.versionName}"
        } catch (_: Exception) {
            binding.splashVersion.text = "v1.0"
        }

        applyBrandGradientToText()

        // Disable back button during splash to prevent partial-load state
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { /* no-op */ }
        })

        startSplashAnimation()
    }

    /**
     * Apply an amber→red linear gradient shader to the "Craftly" brand text,
     * matching the web app header exactly.
     */
    private fun applyBrandGradientToText() {
        binding.splashBrand.post {
            val width = binding.splashBrand.width.toFloat().coerceAtLeast(1f)
            val gradient = LinearGradient(
                0f, 0f, width, 0f,
                intArrayOf(
                    getColor(R.color.amber_600),
                    getColor(R.color.red_500)
                ),
                null,
                Shader.TileMode.CLAMP
            )
            binding.splashBrand.paint.shader = gradient
            binding.splashBrand.invalidate()
        }
    }

    private fun startSplashAnimation() {
        // ── Phase 1: Glow (t=0, 600ms) ─────────────────────────────
        val glowFade = ObjectAnimator.ofFloat(binding.splashGlow, View.ALPHA, 0f, 1f).apply {
            duration = 600
            interpolator = DecelerateInterpolator()
        }
        val glowScale = listOf(
            ObjectAnimator.ofFloat(binding.splashGlow, View.SCALE_X, 0.6f, 1f),
            ObjectAnimator.ofFloat(binding.splashGlow, View.SCALE_Y, 0.6f, 1f)
        ).onEach { it.duration = 700; it.interpolator = DecelerateInterpolator() }

        val glowSet = AnimatorSet().apply { playTogether(glowFade, *glowScale.toTypedArray()) }

        // ── Phase 2: Logo bounce (t=200, 700ms) ─────────────────────
        val logoScaleX = ObjectAnimator.ofFloat(binding.splashLogo, View.SCALE_X, 0.3f, 1f).apply {
            duration = 700
            startDelay = 200
            interpolator = OvershootInterpolator(2.2f)
        }
        val logoScaleY = ObjectAnimator.ofFloat(binding.splashLogo, View.SCALE_Y, 0.3f, 1f).apply {
            duration = 700
            startDelay = 200
            interpolator = OvershootInterpolator(2.2f)
        }
        val logoFade = ObjectAnimator.ofFloat(binding.splashLogo, View.ALPHA, 0f, 1f).apply {
            duration = 400
            startDelay = 200
            interpolator = DecelerateInterpolator()
        }

        // ── Phase 3: Brand text (t=750, 450ms) ──────────────────────
        val brandFade = ObjectAnimator.ofFloat(binding.splashBrand, View.ALPHA, 0f, 1f).apply {
            duration = 450
            startDelay = 750
            interpolator = AccelerateDecelerateInterpolator()
        }
        val brandSlide = ObjectAnimator.ofFloat(binding.splashBrand, View.TRANSLATION_X, -30f, 0f).apply {
            duration = 450
            startDelay = 750
            interpolator = DecelerateInterpolator()
        }

        // ── Phase 4: Dots pop in (t=950, 300ms) ─────────────────────
        val dotsFade = ObjectAnimator.ofFloat(binding.splashDots, View.ALPHA, 0f, 1f).apply {
            duration = 300
            startDelay = 950
        }
        val dotsScale = listOf(
            ObjectAnimator.ofFloat(binding.splashDots, View.SCALE_X, 0f, 1f),
            ObjectAnimator.ofFloat(binding.splashDots, View.SCALE_Y, 0f, 1f)
        ).onEach { it.duration = 300; it.startDelay = 950; it.interpolator = OvershootInterpolator(3f) }

        // ── Phase 5: Tagline slide up (t=1100, 500ms) ───────────────
        val taglineSlide = ObjectAnimator.ofFloat(
            binding.splashTagline, View.TRANSLATION_Y, 40f, 0f
        ).apply {
            duration = 500
            startDelay = 1100
            interpolator = DecelerateInterpolator()
        }
        val taglineFade = ObjectAnimator.ofFloat(binding.splashTagline, View.ALPHA, 0f, 1f).apply {
            duration = 500
            startDelay = 1100
            interpolator = AccelerateDecelerateInterpolator()
        }

        // ── Phase 6: Loader + version (t=1300, 400ms) ───────────────
        val loaderFade = ObjectAnimator.ofFloat(binding.splashLoader, View.ALPHA, 0f, 0.7f).apply {
            duration = 400
            startDelay = 1300
        }
        val versionFade = ObjectAnimator.ofFloat(binding.splashVersion, View.ALPHA, 0f, 0.5f).apply {
            duration = 400
            startDelay = 1300
        }

        // ── Master set — all play concurrently (each self-timed via startDelay) ──
        AnimatorSet().apply {
            playTogether(
                glowSet,
                logoScaleX, logoScaleY, logoFade,
                brandFade, brandSlide,
                dotsFade, *dotsScale.toTypedArray(),
                taglineSlide, taglineFade,
                loaderFade, versionFade
            )
        }.start()

        // Navigate away after all animations settle
        binding.root.postDelayed({ navigateToLogin() }, 2500)
    }

    private fun navigateToLogin() {
        // Fade out the entire screen, then launch the appropriate destination
        val exitFade = ObjectAnimator.ofFloat(binding.splashRoot, View.ALPHA, 1f, 0f).apply {
            duration = 350
            interpolator = AccelerateDecelerateInterpolator()
        }
        exitFade.doOnEnd {
            val prefsManager = SharedPreferencesManager(this@SplashActivity)
            val destination = if (prefsManager.isLoggedIn()) {
                // Already logged in — skip login screen entirely
                Intent(this@SplashActivity, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                }
            } else {
                Intent(this@SplashActivity, LoginActivity::class.java)
            }
            startActivity(destination)
            // No slide transition — plain fade handled above
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
            finish()
        }
        exitFade.start()
    }

}
