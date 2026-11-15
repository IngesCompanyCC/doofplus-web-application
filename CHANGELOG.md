# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y el proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

## [1.2.0] - 2026-11-15
### Changed
- Toda la Web App usa el API de la DoofPlus Platform (`VITE_PLATFORM_API_URL`); se quita la fake API.
- IAM: inicio de sesión con la plataforma, verificación en dos pasos, perfiles de rol desde `/roles` e invitaciones desde `/invitations`.
- Organizations e IoT Monitoring, Subscriptions (planes, suscripción, pagos y cambio de plan), Manufacturing (productos, fórmulas, órdenes, lotes y materias primas) y Quality & Compliance leen y guardan en la plataforma.

### Added
- Contact us muestra los estados de envío y de error.

### Fixed
- Contact us ofrece los entornos por rol en vez de una demostración.

## [1.1.0] - 2026-11-14
### Added
- Estructura del repositorio: README, CONTRIBUTING, CHANGELOG, LICENSE y ADRs.
- Búsqueda de un registro por su código desde la barra superior.
