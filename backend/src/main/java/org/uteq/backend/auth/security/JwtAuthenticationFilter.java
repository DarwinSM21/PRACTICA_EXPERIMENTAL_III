package org.uteq.backend.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.http.Cookie;

import java.io.IOException;

/**
 * Filtro JWT que se ejecuta en cada solicitud.
 * 1. Extrae el token del encabezado Authorization: Bearer [token]
 * 2. Valida la firma y expiracion con JwtService
 * 3. Consulta Redis blacklist para verificar que el JTI no este revocado
 * 4. Establece el UsernamePasswordAuthenticationToken en SecurityContextHolder
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;
    private final RedisBlacklistService blacklistService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String token = null;

        // 1. Extraer el token de la Cookie
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("access_token".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }

        // Si no hay token, continúa con la cadena de filtros normales
        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // 2. ¡CRÍTICO! Validar si el token está en la lista negra de Redis antes de hacer cualquier cosa
            String jti = jwtService.extractJti(token);
            if (jti != null && blacklistService.estaRevocado(jti)) { // Ajusta al nombre de tu método en RedisBlacklistService
                filterChain.doFilter(request, response);
                return;
            }

            // 3. Flujo normal de validación del token de Spring Security
            String username = jwtService.extractUsername(token);
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                if (jwtService.isTokenValid(token)) { // Asegúrate de validar el token contra los detalles del usuario si es necesario
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Error de parseo o expiración, simplemente no autentica al usuario en el contexto
        }

        filterChain.doFilter(request, response);
    }
}
