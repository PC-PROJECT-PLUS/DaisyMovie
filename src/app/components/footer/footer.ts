import { Component, inject } from '@angular/core';
import { ResponsiveService } from '../../services/responsive';
import { FooterMobile } from './footer-mobile/footer-mobile';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [FooterMobile],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class FooterComponent {
  public responsiveService = inject(ResponsiveService);
}
