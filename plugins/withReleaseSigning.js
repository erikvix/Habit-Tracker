/**
 * Assinatura e versão do APK de release gerado no CI (GitHub Actions).
 *
 * - Assinatura: se `ANDROID_KEYSTORE_PATH` existir no ambiente do Gradle, o release é assinado
 *   com essa keystore (+ `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`).
 *   Sem a variável, fica como o template (debug), então builds locais e EAS não mudam.
 * - Versão: `APP_VERSION_NAME` e `APP_VERSION_CODE`, se definidos no prebuild, sobrepõem
 *   `version` e `android.versionCode` do app.json.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// todo-tracker: release-signing';

const RELEASE_SIGNING = `
        release {
            ${MARK}
            if (System.getenv('ANDROID_KEYSTORE_PATH')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }`;

const USE_RELEASE =
  "signingConfig System.getenv('ANDROID_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug";

function applySigning(gradle) {
  if (gradle.includes(MARK)) return gradle;

  // 1) buildTypes.release passa a usar a keystore quando ela existir.
  const buildTypes = gradle.indexOf('buildTypes {');
  const releaseType = buildTypes < 0 ? -1 : gradle.indexOf('release {', buildTypes);
  const debugUse =
    releaseType < 0 ? -1 : gradle.indexOf('signingConfig signingConfigs.debug', releaseType);
  if (debugUse < 0)
    throw new Error('withReleaseSigning: buildTypes.release não encontrado no build.gradle');
  gradle =
    gradle.slice(0, debugUse) +
    USE_RELEASE +
    gradle.slice(debugUse + 'signingConfig signingConfigs.debug'.length);

  // 2) signingConfigs ganha o bloco release, logo depois do debug.
  const debugBlock = /(signingConfigs \{\s*debug \{[^}]*\})/;
  if (!debugBlock.test(gradle)) {
    throw new Error('withReleaseSigning: signingConfigs.debug não encontrado no build.gradle');
  }
  return gradle.replace(debugBlock, `$1${RELEASE_SIGNING}`);
}

module.exports = function withReleaseSigning(config) {
  const name = process.env.APP_VERSION_NAME;
  const code = process.env.APP_VERSION_CODE;
  if (name) config.version = name;
  if (code) {
    const n = Number(code);
    if (!Number.isInteger(n) || n < 1) {
      throw new Error(`withReleaseSigning: APP_VERSION_CODE inválido: ${code}`);
    }
    config.android = { ...config.android, versionCode: n };
  }

  return withAppBuildGradle(config, (c) => {
    if (c.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning: só suporta build.gradle em Groovy');
    }
    c.modResults.contents = applySigning(c.modResults.contents);
    return c;
  });
};
