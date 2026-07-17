package org.uteq.backend.auth.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.uteq.backend.auth.dto.*;
import org.uteq.backend.auth.entity.Persona;
import org.uteq.backend.auth.entity.Rol;
import org.uteq.backend.auth.entity.Usuario;
import org.uteq.backend.auth.repository.PersonaRepository;
import org.uteq.backend.auth.repository.RolRepository;
import org.uteq.backend.auth.repository.UsuarioRepository;
import org.uteq.backend.auth.security.JwtService;
import org.uteq.backend.auth.security.LoginAttemptService;
import org.uteq.backend.auth.security.RedisBlacklistService;
import org.uteq.backend.common.exception.TooManyRequestsException;
import jakarta.servlet.http.Cookie;

import java.util.Set;

/**
 * Controlador de autenticacion JWT.
 * Endpoints: registro, login, logout, refresh, /me.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RedisBlacklistService blacklistService;
    private final LoginAttemptService loginAttemptService;
    private final UsuarioRepository usuarioRepository;
    private final PersonaRepository personaRepository;
    private final RolRepository rolRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @PostMapping("/registro")
    public ResponseEntity<SesionResponse> registro(@Valid @RequestBody RegisterRequest request) {
        if (usuarioRepository.existsByUsername(request.username())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        Persona persona = Persona.builder()
                .nombre(request.nombre())
                .apellido(request.apellido())
                .activo(true)
                .build();
        persona = personaRepository.save(persona);

        Rol rolUser = rolRepository.findByNombre("USER")
                .orElseGet(() -> rolRepository.save(
                        Rol.builder().nombre("USER").descripcion("Usuario estandar").build()));

        Usuario usuario = Usuario.builder()
                .persona(persona)
                .username(request.username())
                .passwordHash(passwordEncoder.encode(request.password()))
                .activo(true)
                .roles(Set.of(rolUser))
                .build();
        usuario = usuarioRepository.save(usuario);

        String nombreCompleto = persona.getNombre() + " " + persona.getApellido();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(SesionResponse.builder()
                        .username(usuario.getUsername())
                        .nombre(nombreCompleto)
                        .rol("USER")
                        .build());
    }

    @PostMapping("/login")
    public ResponseEntity<SesionResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) { // <--- Inyectamos HttpServletResponse

        String ip = httpRequest.getRemoteAddr();

        if (loginAttemptService.estaBloqueada(ip)) {
            throw new TooManyRequestsException(
                    "Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.");
        }

        Authentication auth;
        try {
            auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        } catch (BadCredentialsException e) {
            loginAttemptService.registrarFallo(ip);
            throw e;
        }

        loginAttemptService.registrarExito(ip);

        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        String rol = userDetails.getAuthorities().iterator().next().getAuthority();

        // 1. Generamos los tokens
        String accessToken = jwtService.generateToken(userDetails.getUsername(), rol);
        String refreshToken = jwtService.generateRefreshToken(userDetails.getUsername(), rol);

        // 2. Creamos y configuramos las cookies HttpOnly
        Cookie accessCookie = new Cookie("access_token", accessToken);
        accessCookie.setHttpOnly(true);
        accessCookie.setSecure(true); // Cambiar a false solo en desarrollo local sin HTTPS
        accessCookie.setPath("/");
        accessCookie.setMaxAge(15 * 60); // 15 minutos (ajusta expiración)
        accessCookie.setAttribute("SameSite", "Lax"); 

        Cookie refreshCookie = new Cookie("refresh_token", refreshToken);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(true);
        refreshCookie.setPath("/api/auth/refresh"); // Solo se envía en la ruta de refresco
        refreshCookie.setMaxAge(24 * 60 * 60); // 24 horas (ajusta expiración)

        // 3. Añadimos las cookies a la respuesta
        httpResponse.addCookie(accessCookie);
        httpResponse.addCookie(refreshCookie);

        String nombre = usuarioRepository.findByUsername(userDetails.getUsername())
                .map(u -> u.getPersona().getNombre() + " " + u.getPersona().getApellido())
                .orElse(userDetails.getUsername());

        // Ya no devolvemos tokens en el cuerpo JSON (evitamos que JS los manipule)
        return ResponseEntity.ok(SesionResponse.builder()
                .username(userDetails.getUsername())
                .nombre(nombre)
                .rol(rol)
                .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        // 1. Buscamos el access_token en las cookies para mandarlo a la lista negra
        String token = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("access_token".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }

        if (token != null) {
            try {
                String jti = jwtService.extractJti(token);
                if (jti != null) {
                    // Calculamos el tiempo de expiración real restante de este token específico
                    long tiempoRestante = jwtService.getRemainingTimeMs(token); 
                    blacklistService.revocar(jti, tiempoRestante);
                }
            } catch (Exception e) {
                // Token ya inválido o expirado, ignorar
            }
        }

        // 2. Eliminamos las cookies del navegador (poniendo maxAge en 0)
        Cookie clearAccess = new Cookie("access_token", null);
        clearAccess.setHttpOnly(true);
        clearAccess.setSecure(true);
        clearAccess.setPath("/");
        clearAccess.setMaxAge(0);
        response.addCookie(clearAccess);

        Cookie clearRefresh = new Cookie("refresh_token", null);
        clearRefresh.setHttpOnly(true);
        clearRefresh.setSecure(true);
        clearRefresh.setPath("/api/auth/refresh");
        clearRefresh.setMaxAge(0);
        response.addCookie(clearRefresh);

        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request, HttpServletResponse response) {
        // 1. Extraemos el refresh_token desde las cookies
        String refreshToken = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("refresh_token".equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (refreshToken == null || !jwtService.isTokenValid(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username = jwtService.extractUsername(refreshToken);
        String rol = jwtService.extractRol(refreshToken);

        // 2. Generamos un nuevo Access Token
        String newAccessToken = jwtService.generateToken(username, rol);

        // 3. Lo inyectamos de nuevo en la cookie
        Cookie accessCookie = new Cookie("access_token", newAccessToken);
        accessCookie.setHttpOnly(true);
        accessCookie.setSecure(true);
        accessCookie.setPath("/");
        accessCookie.setMaxAge(15 * 60); 
        response.addCookie(accessCookie);

        return ResponseEntity.ok().build(); // No retornamos JSON, la cookie viaja en las cabeceras
    }

    @GetMapping("/me")
    public ResponseEntity<SesionResponse> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        String rol = userDetails.getAuthorities().iterator().next().getAuthority();

        String nombre = usuarioRepository.findByUsername(userDetails.getUsername())
                .map(u -> u.getPersona().getNombre() + " " + u.getPersona().getApellido())
                .orElse(userDetails.getUsername());

        return ResponseEntity.ok(SesionResponse.builder()
                .username(userDetails.getUsername())
                .nombre(nombre)
                .rol(rol)
                .build());
    }

    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }
}
